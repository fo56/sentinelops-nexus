"""
Analytics Models and Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class AnalyticsType(str, Enum):
    """Types of analytics"""
    LOGIN_ATTEMPTS = "login_attempts"
    USER_ACTIVITY = "user_activity"
    DOCUMENT_OPERATIONS = "document_operations"
    ROLE_DISTRIBUTION = "role_distribution"
    SECURITY_EVENTS = "security_events"


class TimeRange(str, Enum):
    """Time range for analytics"""
    LAST_24H = "24h"
    LAST_7D = "7d"
    LAST_30D = "30d"
    LAST_90D = "90d"
    CUSTOM = "custom"


class LoginAnalytics(BaseModel):
    """Login statistics"""
    total_logins: int
    successful_logins: int
    failed_logins: int
    success_rate: float = Field(ge=0, le=1)
    average_login_time: float = Field(description="In milliseconds")
    unique_users: int
    unique_locations: List[str]
    device_breakdown: Dict[str, int]
    hourly_distribution: Dict[str, int]


class UserActivityAnalytics(BaseModel):
    """User activity statistics"""
    active_users: int
    inactive_users: int
    new_users: int
    user_roles_breakdown: Dict[str, int]
    average_session_duration: float
    total_sessions: int
    most_active_hours: List[str]
    avg_requests_per_user: float


class DocumentAnalytics(BaseModel):
    """Document operations statistics"""
    total_documents: int
    documents_uploaded: int
    documents_processed: int
    average_processing_time: float
    documents_by_type: Dict[str, int]
    storage_used: float = Field(description="In bytes")
    documents_by_user: int
    total_downloads: int


class SecurityAnalytics(BaseModel):
    """Security event statistics"""
    total_security_events: int
    unauthorized_access_attempts: int
    suspicious_activities: int
    events_by_severity: Dict[str, int]  # critical, high, medium, low
    top_attack_vectors: List[str]


class AnalyticsReport(BaseModel):
    """Comprehensive analytics report"""
    report_id: str
    generated_at: datetime
    time_range: TimeRange
    start_date: datetime
    end_date: datetime
    login_analytics: Optional[LoginAnalytics]
    user_activity: Optional[UserActivityAnalytics]
    document_analytics: Optional[DocumentAnalytics]
    security_analytics: Optional[SecurityAnalytics]
    summary: Dict[str, Any]
    recommendations: List[str]


class AnomalyAlert(BaseModel):
    """System anomaly alert"""
    alert_id: str
    alert_type: str
    severity: str = Field(description="critical|high|medium|low")
    message: str
    detected_at: datetime
    affected_users: Optional[List[str]]
    metric_name: str
    metric_value: float
    threshold_value: float
    recommendations: List[str]


class MetricDataPoint(BaseModel):
    """Single metric data point"""
    timestamp: datetime
    value: float
    metric_name: str
    category: Optional[str]
    user_id: Optional[str]

