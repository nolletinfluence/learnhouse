
from sqlalchemy import CheckConstraint, Column, ForeignKey, Integer, UniqueConstraint
from sqlmodel import Field, SQLModel


class EnrollmentRequest(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint("course_id", "user_id", name="uq_enrollmentrequest_course_user"),
        CheckConstraint("status IN ('pending', 'approved', 'rejected')", name="ck_enrollmentrequest_status"),
    )
    id: int | None = Field(default=None, primary_key=True)
    course_id: int = Field(sa_column=Column(Integer, ForeignKey("course.id", ondelete="CASCADE"), index=True, nullable=False))
    org_id: int = Field(sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"), index=True, nullable=False))
    user_id: int = Field(sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), index=True, nullable=False))
    status: str = "pending"
    decided_by: int | None = Field(default=None, sa_column=Column(Integer, ForeignKey("user.id", ondelete="SET NULL")))
    creation_date: str
    update_date: str


class LessonAttendance(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint("activity_id", "user_id", name="uq_lessonattendance_activity_user"),
        CheckConstraint("status IN ('present', 'absent', 'excused')", name="ck_lessonattendance_status"),
        CheckConstraint("grade IS NULL OR (grade >= 0 AND grade <= 100)", name="ck_lessonattendance_grade"),
    )
    id: int | None = Field(default=None, primary_key=True)
    activity_id: int = Field(sa_column=Column(Integer, ForeignKey("activity.id", ondelete="CASCADE"), index=True, nullable=False))
    course_id: int = Field(sa_column=Column(Integer, ForeignKey("course.id", ondelete="CASCADE"), index=True, nullable=False))
    org_id: int = Field(sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"), index=True, nullable=False))
    user_id: int = Field(sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), index=True, nullable=False))
    status: str
    grade: int | None = None
    note: str = ""
    marked_by: int | None = Field(default=None, sa_column=Column(Integer, ForeignKey("user.id", ondelete="SET NULL")))
    creation_date: str
    update_date: str
