"""
Analytics Services
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
    """Advanced Analytics Service"""
    
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
        """Get login statistics"""
        start_date, end_date = self._get_date_range(time_range)
        
        # Query identity logs
        logs = await self.db['identity_logs'].find({
            'timestamp': {'$gte': start_date, '$lte': end_date}
        }).to_list(None)
        
        total_logins = len(logs)
        successful = sum(1 for log in logs if log.get('login_success', False))
        failed = total_logins - successful
        
        unique_users = len(set(log.get('user_id') for log in logs))
        unique_locations = list(set(log.get('ip_address') for log in logs if log.get('ip_address')))
        
        # Device breakdown
        devices = {}
        for log in logs:
            device = log.get('device_type', 'unknown')
            devices[device] = devices.get(device, 0) + 1
        
        # Hourly distribution
        hourly = {}
        for log in logs:
            hour = log['timestamp'].strftime('%H:00')
            hourly[hour] = hourly.get(hour, 0) + 1
        
        avg_login_time = sum(log.get('login_duration', 0) for log in logs) / max(total_logins, 1)
        
        return LoginAnalytics(
            total_logins=total_logins,
            successful_logins=successful,
            failed_logins=failed,
            success_rate=successful / max(total_logins, 1),
            average_login_time=avg_login_time,
            unique_users=unique_users,
            unique_locations=unique_locations[:10],  # Top 10
            device_breakdown=devices,
            hourly_distribution=hourly
        )
    
    async def get_user_activity_analytics(
        self,
        time_range: TimeRange = TimeRange.LAST_7D
    ) -> UserActivityAnalytics:
        """Get user activity statistics"""
        start_date, end_date = self._get_date_range(time_range)
        
        users = await self.db['users'].find({}).to_list(None)
        total_users = len(users)
        
        # Get activity
        activity_logs = await self.db['activity_logs'].find({
            'timestamp': {'$gte': start_date, '$lte': end_date}
        }).to_list(None)
        
        active_user_ids = set(log.get('user_id') for log in activity_logs)
        active_users = len(active_user_ids)
        inactive_users = total_users - active_users
        
        # New users
        new_users = len(await self.db['users'].find({
            'created_at': {'$gte': start_date, '$lte': end_date}
        }).to_list(None))
        
        # Role breakdown
        role_breakdown = {}
        for user in users:
            role = user.get('role', 'user')
            role_breakdown[role] = role_breakdown.get(role, 0) + 1
        
        # Session stats
        total_sessions = len(activity_logs)
        avg_session_duration = sum(log.get('duration', 0) for log in activity_logs) / max(total_sessions, 1)
        
        # Most active hours
        hourly_activity = {}
        for log in activity_logs:
            hour = log['timestamp'].strftime('%H:00')
            hourly_activity[hour] = hourly_activity.get(hour, 0) + 1
        
        most_active_hours = sorted(hourly_activity.items(), key=lambda x: x[1], reverse=True)[:5]
        most_active_hours = [h[0] for h in most_active_hours]
        
        avg_requests = total_sessions / max(active_users, 1)
        
        return UserActivityAnalytics(
            active_users=active_users,
            inactive_users=inactive_users,
            new_users=new_users,
            user_roles_breakdown=role_breakdown,
            average_session_duration=avg_session_duration,
            total_sessions=total_sessions,
            most_active_hours=most_active_hours,
            avg_requests_per_user=avg_requests
        )
    
    async def get_document_analytics(
        self,
        time_range: TimeRange = TimeRange.LAST_7D
    ) -> DocumentAnalytics:
        """Get document operation statistics"""
        start_date, end_date = self._get_date_range(time_range)
        
        documents = await self.db['documents'].find({}).to_list(None)
        total_docs = len(documents)
        
        uploaded = len(await self.db['documents'].find({
            'created_at': {'$gte': start_date, '$lte': end_date}
        }).to_list(None))
        
        processed = sum(1 for doc in documents if doc.get('processing_status') == 'completed')
        
        # Document types
        doc_types = {}
        for doc in documents:
            doc_type = doc.get('file_type', 'unknown')
            doc_types[doc_type] = doc_types.get(doc_type, 0) + 1
        
        # Storage used
        storage = sum(doc.get('file_size', 0) for doc in documents)
        
        # Processing time
        processing_times = [d.get('processing_time', 0) for d in documents if d.get('processing_time')]
        avg_processing = sum(processing_times) / len(processing_times) if processing_times else 0
        
        # Downloads
        downloads = await self.db['document_access_logs'].count_documents({
            'timestamp': {'$gte': start_date, '$lte': end_date},
            'action': 'download'
        })
        
        return DocumentAnalytics(
            total_documents=total_docs,
            documents_uploaded=uploaded,
            documents_processed=processed,
            average_processing_time=avg_processing,
            documents_by_type=doc_types,
            storage_used=storage,
            documents_by_user=total_docs,
            total_downloads=downloads
        )
    
    async def get_security_analytics(
        self,
        time_range: TimeRange = TimeRange.LAST_7D
    ) -> SecurityAnalytics:
        """Get security event statistics"""
        start_date, end_date = self._get_date_range(time_range)
        
        events = await self.db['security_events'].find({
            'timestamp': {'$gte': start_date, '$lte': end_date}
        }).to_list(None)
        
        total_events = len(events)
        
        # Unauthorized access
        unauthorized = len(await self.db['identity_logs'].find({
            'event_type': 'unauthorized_access',
            'timestamp': {'$gte': start_date, '$lte': end_date}
        }).to_list(None))
        
        # Suspicious activities
        suspicious = sum(1 for e in events if e.get('severity') in ['critical', 'high'])
        
        # Severity breakdown
        severity_breakdown = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
        for event in events:
            severity = event.get('severity', 'low')
            if severity in severity_breakdown:
                severity_breakdown[severity] += 1
        
        return SecurityAnalytics(
            total_security_events=total_events,
            unauthorized_access_attempts=unauthorized,
            suspicious_activities=suspicious,
            events_by_severity=severity_breakdown,
            top_attack_vectors=["failed_login", "brute_force", "unauthorized_access"]
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
        """Detect system anomalies"""
        alerts = []
        
        # Check for unusual login pattern
        login_stats = await self.get_login_analytics(TimeRange.LAST_24H)
        
        if login_stats.failed_logins > login_stats.successful_logins:
            alert = AnomalyAlert(
                alert_id='anomaly_001',
                alert_type='high_failure_rate',
                severity='high',
                message='Unusually high login failure rate detected',
                detected_at=datetime.utcnow(),
                metric_name='login_failure_rate',
                metric_value=login_stats.failed_logins / max(login_stats.total_logins, 1),
                threshold_value=0.3,
                recommendations=['Review access policies', 'Check for brute force attacks']
            )
            alerts.append(alert)
        
        # Check for unusual storage growth
        storage_stats = await self.get_document_analytics(TimeRange.LAST_24H)
        
        if storage_stats.storage_used > 10 * 1024 * 1024 * 1024:  # 10GB
            alert = AnomalyAlert(
                alert_id='anomaly_002',
                alert_type='high_storage',
                severity='medium',
                message='Storage usage is high',
                detected_at=datetime.utcnow(),
                metric_name='storage_usage',
                metric_value=storage_stats.storage_used,
                threshold_value=10 * 1024 * 1024 * 1024,
                recommendations=['Archive old documents', 'Implement retention policy']
            )
            alerts.append(alert)
        
        return alerts
