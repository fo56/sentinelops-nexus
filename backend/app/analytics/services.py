"""
Analytics Services
Uses MongoDB aggregation pipelines for efficient data processing
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from motor.motor_asyncio import AsyncIOMotorClient
from app.analytics.models import (
    LoginAnalytics, UserActivityAnalytics, DocumentAnalytics,
    SecurityAnalytics, AnalyticsReport, TimeRange, AnomalyAlert,
    MetricDataPoint
)


class AnalyticsService:
    """Advanced Analytics Service using MongoDB aggregation pipelines"""
    
    def __init__(self, db):
        self.db = db
        self.metrics_collection = db['analytics_metrics']
        self.alerts_collection = db['anomaly_alerts']
        self.events_collection = db['security_events']
    
    def _get_date_range(self, time_range: TimeRange, custom_start: Optional[datetime] = None, 
                       custom_end: Optional[datetime] = None) -> Tuple[datetime, datetime]:
        """Get date range based on time range type"""
        end_date = datetime.utcnow()
        
        if time_range == TimeRange.CUSTOM:
            start_date = custom_start or (end_date - timedelta(days=30))
            end_date = custom_end or end_date
        elif time_range == TimeRange.LAST_24H:
            start_date = end_date - timedelta(hours=24)
        elif time_range == TimeRange.LAST_7D:
            start_date = end_date - timedelta(days=7)
        elif time_range == TimeRange.LAST_30D:
            start_date = end_date - timedelta(days=30)
        elif time_range == TimeRange.LAST_90D:
            start_date = end_date - timedelta(days=90)
        else:
            start_date = end_date - timedelta(days=30)
        
        return start_date, end_date
    
    async def get_login_analytics(
        self, 
        time_range: TimeRange = TimeRange.LAST_7D
    ) -> LoginAnalytics:
        """Get login statistics using aggregation pipeline"""
        start_date, end_date = self._get_date_range(time_range)
        date_filter = {'timestamp': {'$gte': start_date, '$lte': end_date}}
        
        # Single aggregation with $facet for all login metrics
        pipeline = [
            {'$match': date_filter},
            {'$facet': {
                'totals': [
                    {'$group': {
                        '_id': None,
                        'total': {'$sum': 1},
                        'successful': {'$sum': {'$cond': ['$login_success', 1, 0]}},
                        'failed': {'$sum': {'$cond': ['$login_success', 0, 1]}},
                        'avg_login_time': {'$avg': {'$ifNull': ['$login_duration', 0]}},
                        'unique_users': {'$addToSet': '$user_id'},
                        'unique_locations': {'$addToSet': '$ip_address'}
                    }}
                ],
                'device_breakdown': [
                    {'$group': {
                        '_id': {'$ifNull': ['$device_type', 'unknown']},
                        'count': {'$sum': 1}
                    }}
                ],
                'hourly_distribution': [
                    {'$group': {
                        '_id': {'$dateToString': {'format': '%H:00', 'date': '$timestamp'}},
                        'count': {'$sum': 1}
                    }}
                ]
            }}
        ]
        
        result = await self.db['identity_logs'].aggregate(pipeline).to_list(1)
        
        if not result or not result[0]['totals']:
            return LoginAnalytics(
                total_logins=0, successful_logins=0, failed_logins=0,
                success_rate=0.0, average_login_time=0.0, unique_users=0,
                unique_locations=[], device_breakdown={}, hourly_distribution={}
            )
        
        data = result[0]
        totals = data['totals'][0]
        total = totals['total']
        successful = totals['successful']
        
        # Convert arrays to dicts
        devices = {d['_id']: d['count'] for d in data['device_breakdown']}
        hourly = {h['_id']: h['count'] for h in data['hourly_distribution']}
        
        # Filter None from unique locations
        locations = [loc for loc in totals['unique_locations'] if loc is not None]
        
        return LoginAnalytics(
            total_logins=total,
            successful_logins=successful,
            failed_logins=totals['failed'],
            success_rate=successful / max(total, 1),
            average_login_time=totals['avg_login_time'] or 0.0,
            unique_users=len(totals['unique_users']),
            unique_locations=locations[:10],
            device_breakdown=devices,
            hourly_distribution=hourly
        )
    
    async def get_user_activity_analytics(
        self,
        time_range: TimeRange = TimeRange.LAST_7D
    ) -> UserActivityAnalytics:
        """Get user activity statistics using aggregation pipeline"""
        start_date, end_date = self._get_date_range(time_range)
        
        # User counts and role breakdown via aggregation
        user_pipeline = [
            {'$facet': {
                'role_breakdown': [
                    {'$group': {
                        '_id': {'$ifNull': ['$role', 'user']},
                        'count': {'$sum': 1}
                    }}
                ],
                'new_users': [
                    {'$match': {'created_at': {'$gte': start_date, '$lte': end_date}}},
                    {'$count': 'count'}
                ],
                'total': [
                    {'$count': 'count'}
                ]
            }}
        ]
        
        user_result = await self.db['users'].aggregate(user_pipeline).to_list(1)
        user_data = user_result[0] if user_result else {}
        
        total_users = user_data.get('total', [{}])[0].get('count', 0)
        new_users = user_data.get('new_users', [{}])[0].get('count', 0) if user_data.get('new_users') else 0
        role_breakdown = {r['_id']: r['count'] for r in user_data.get('role_breakdown', [])}
        
        # Activity stats via aggregation
        activity_pipeline = [
            {'$match': {'timestamp': {'$gte': start_date, '$lte': end_date}}},
            {'$facet': {
                'session_stats': [
                    {'$group': {
                        '_id': None,
                        'total_sessions': {'$sum': 1},
                        'avg_duration': {'$avg': {'$ifNull': ['$duration', 0]}},
                        'active_users': {'$addToSet': '$user_id'}
                    }}
                ],
                'hourly_activity': [
                    {'$group': {
                        '_id': {'$dateToString': {'format': '%H:00', 'date': '$timestamp'}},
                        'count': {'$sum': 1}
                    }},
                    {'$sort': {'count': -1}},
                    {'$limit': 5}
                ]
            }}
        ]
        
        activity_result = await self.db['activity_logs'].aggregate(activity_pipeline).to_list(1)
        activity_data = activity_result[0] if activity_result else {}
        
        session_stats = activity_data.get('session_stats', [{}])
        stats = session_stats[0] if session_stats else {}
        
        active_users = len(stats.get('active_users', []))
        total_sessions = stats.get('total_sessions', 0)
        avg_session_duration = stats.get('avg_duration', 0.0) or 0.0
        most_active_hours = [h['_id'] for h in activity_data.get('hourly_activity', [])]
        
        return UserActivityAnalytics(
            active_users=active_users,
            inactive_users=max(0, total_users - active_users),
            new_users=new_users,
            user_roles_breakdown=role_breakdown,
            average_session_duration=avg_session_duration,
            total_sessions=total_sessions,
            most_active_hours=most_active_hours,
            avg_requests_per_user=total_sessions / max(active_users, 1)
        )
    
    async def get_document_analytics(
        self,
        time_range: TimeRange = TimeRange.LAST_7D
    ) -> DocumentAnalytics:
        """Get document operation statistics using aggregation pipeline"""
        start_date, end_date = self._get_date_range(time_range)
        
        # Document stats via $facet aggregation
        doc_pipeline = [
            {'$facet': {
                'totals': [
                    {'$group': {
                        '_id': None,
                        'total': {'$sum': 1},
                        'processed': {'$sum': {'$cond': [
                            {'$eq': ['$processing_status', 'completed']}, 1, 0
                        ]}},
                        'total_storage': {'$sum': {'$ifNull': ['$file_size', 0]}}
                    }}
                ],
                'uploaded_in_range': [
                    {'$match': {'created_at': {'$gte': start_date, '$lte': end_date}}},
                    {'$count': 'count'}
                ],
                'by_type': [
                    {'$group': {
                        '_id': {'$ifNull': ['$file_type', 'unknown']},
                        'count': {'$sum': 1}
                    }}
                ],
                'processing_time': [
                    {'$match': {'processing_time': {'$exists': True, '$gt': 0}}},
                    {'$group': {
                        '_id': None,
                        'avg_time': {'$avg': '$processing_time'}
                    }}
                ]
            }}
        ]
        
        result = await self.db['documents'].aggregate(doc_pipeline).to_list(1)
        
        if not result:
            return DocumentAnalytics(
                total_documents=0, documents_uploaded=0, documents_processed=0,
                average_processing_time=0.0, documents_by_type={}, storage_used=0.0,
                documents_by_user=0, total_downloads=0
            )
        
        data = result[0]
        totals = data['totals'][0] if data['totals'] else {}
        uploaded = data['uploaded_in_range'][0]['count'] if data['uploaded_in_range'] else 0
        doc_types = {d['_id']: d['count'] for d in data.get('by_type', [])}
        avg_processing = data['processing_time'][0]['avg_time'] if data['processing_time'] else 0.0
        
        # Downloads count
        downloads = await self.db['document_access_logs'].count_documents({
            'timestamp': {'$gte': start_date, '$lte': end_date},
            'action': 'download'
        })
        
        return DocumentAnalytics(
            total_documents=totals.get('total', 0),
            documents_uploaded=uploaded,
            documents_processed=totals.get('processed', 0),
            average_processing_time=avg_processing,
            documents_by_type=doc_types,
            storage_used=float(totals.get('total_storage', 0)),
            documents_by_user=totals.get('total', 0),
            total_downloads=downloads
        )
    
    async def get_security_analytics(
        self,
        time_range: TimeRange = TimeRange.LAST_7D
    ) -> SecurityAnalytics:
        """Get security event statistics using aggregation pipeline"""
        start_date, end_date = self._get_date_range(time_range)
        date_filter = {'timestamp': {'$gte': start_date, '$lte': end_date}}
        
        # Security events aggregation
        sec_pipeline = [
            {'$match': date_filter},
            {'$facet': {
                'totals': [
                    {'$group': {
                        '_id': None,
                        'total': {'$sum': 1},
                        'suspicious': {'$sum': {'$cond': [
                            {'$in': ['$severity', ['critical', 'high']]}, 1, 0
                        ]}}
                    }}
                ],
                'by_severity': [
                    {'$group': {
                        '_id': {'$ifNull': ['$severity', 'low']},
                        'count': {'$sum': 1}
                    }}
                ],
                'top_vectors': [
                    {'$group': {
                        '_id': {'$ifNull': ['$event_type', 'unknown']},
                        'count': {'$sum': 1}
                    }},
                    {'$sort': {'count': -1}},
                    {'$limit': 5}
                ]
            }}
        ]
        
        result = await self.db['security_events'].aggregate(sec_pipeline).to_list(1)
        
        # Unauthorized access count from identity logs
        unauthorized = await self.db['identity_logs'].count_documents({
            'event_type': 'unauthorized_access',
            **date_filter
        })
        
        if not result or not result[0]['totals']:
            return SecurityAnalytics(
                total_security_events=0, unauthorized_access_attempts=unauthorized,
                suspicious_activities=0,
                events_by_severity={'critical': 0, 'high': 0, 'medium': 0, 'low': 0},
                top_attack_vectors=[]
            )
        
        data = result[0]
        totals = data['totals'][0]
        
        # Build severity breakdown with defaults
        severity_breakdown = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
        for item in data['by_severity']:
            if item['_id'] in severity_breakdown:
                severity_breakdown[item['_id']] = item['count']
        
        # Data-driven attack vectors
        top_vectors = [v['_id'] for v in data.get('top_vectors', [])]
        
        return SecurityAnalytics(
            total_security_events=totals['total'],
            unauthorized_access_attempts=unauthorized,
            suspicious_activities=totals['suspicious'],
            events_by_severity=severity_breakdown,
            top_attack_vectors=top_vectors
        )
    
    async def generate_full_report(
        self,
        time_range: TimeRange = TimeRange.LAST_7D
    ) -> AnalyticsReport:
        """Generate comprehensive analytics report"""
        import uuid
        from datetime import datetime
        
        start_date, end_date = self._get_date_range(time_range)
        
        login_analytics = await self.get_login_analytics(time_range)
        user_activity = await self.get_user_activity_analytics(time_range)
        document_analytics = await self.get_document_analytics(time_range)
        security_analytics = await self.get_security_analytics(time_range)
        
        # Generate recommendations
        recommendations = []
        
        if login_analytics.failed_logins > login_analytics.successful_logins * 0.5:
            recommendations.append("High failed login rate detected. Review access policies.")

        
        if user_activity.inactive_users > user_activity.active_users:
            recommendations.append("Many inactive users. Consider license optimization.")
        
        summary = {
            "total_logins": login_analytics.total_logins,
            "active_users": user_activity.active_users,
            "security_events": security_analytics.total_security_events,
            "documents_processed": document_analytics.documents_processed,
            "storage_usage_gb": round(document_analytics.storage_used / (1024**3), 2)
        }
        
        report = AnalyticsReport(
            report_id=str(uuid.uuid4()),
            generated_at=datetime.utcnow(),
            time_range=time_range,
            start_date=start_date,
            end_date=end_date,
            login_analytics=login_analytics,
            user_activity=user_activity,
            document_analytics=document_analytics,
            security_analytics=security_analytics,
            summary=summary,
            recommendations=recommendations
        )
        
        return report
    
    async def log_metric(
        self,
        metric_name: str,
        value: float,
        category: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> None:
        """Log a metric data point"""
        metric_doc = {
            'timestamp': datetime.utcnow(),
            'metric_name': metric_name,
            'value': value,
            'category': category,
            'user_id': user_id
        }
        
        await self.metrics_collection.insert_one(metric_doc)
    
    async def detect_anomalies(self) -> List[AnomalyAlert]:
        """Detect system anomalies using lightweight count queries"""
        alerts = []
        start_24h = datetime.utcnow() - timedelta(hours=24)
        date_filter = {'timestamp': {'$gte': start_24h}}
        
        # Login anomaly via count queries (no full collection load)
        total_logins = await self.db['identity_logs'].count_documents(date_filter)
        failed_logins = await self.db['identity_logs'].count_documents({
            **date_filter,
            'login_success': False
        })
        successful_logins = total_logins - failed_logins
        
        if total_logins > 0 and failed_logins > successful_logins:
            alert = AnomalyAlert(
                alert_id=f'anomaly_login_{datetime.utcnow().strftime("%Y%m%d%H")}',
                alert_type='high_failure_rate',
                severity='high',
                message='Unusually high login failure rate detected',
                detected_at=datetime.utcnow(),
                metric_name='login_failure_rate',
                metric_value=failed_logins / max(total_logins, 1),
                threshold_value=0.3,
                recommendations=['Review access policies', 'Check for brute force attacks']
            )
            alerts.append(alert)
        
        # Storage anomaly via aggregation (sum only, no full load)
        storage_pipeline = [
            {'$group': {'_id': None, 'total_storage': {'$sum': {'$ifNull': ['$file_size', 0]}}}}
        ]
        storage_result = await self.db['documents'].aggregate(storage_pipeline).to_list(1)
        storage_used = storage_result[0]['total_storage'] if storage_result else 0
        
        if storage_used > 10 * 1024 * 1024 * 1024:  # 10GB
            alert = AnomalyAlert(
                alert_id=f'anomaly_storage_{datetime.utcnow().strftime("%Y%m%d%H")}',
                alert_type='high_storage',
                severity='medium',
                message='Storage usage is high',
                detected_at=datetime.utcnow(),
                metric_name='storage_usage',
                metric_value=float(storage_used),
                threshold_value=float(10 * 1024 * 1024 * 1024),
                recommendations=['Archive old documents', 'Implement retention policy']
            )
            alerts.append(alert)
        
        return alerts
