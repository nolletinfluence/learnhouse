"""Add course applications and mentor attendance records."""
import sqlalchemy as sa
from alembic import op

revision = "e1a2b3c4d5f6"
down_revision = "d3e4f5a6b7c8"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "enrollmentrequest" not in tables:
        op.create_table("enrollmentrequest",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("course_id", sa.Integer(), sa.ForeignKey("course.id", ondelete="CASCADE"), nullable=False),
            sa.Column("org_id", sa.Integer(), sa.ForeignKey("organization.id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
            sa.Column("status", sa.String(), nullable=False),
            sa.Column("decided_by", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL")),
            sa.Column("creation_date", sa.String(), nullable=False),
            sa.Column("update_date", sa.String(), nullable=False),
            sa.UniqueConstraint("course_id", "user_id", name="uq_enrollmentrequest_course_user"),
            sa.CheckConstraint("status IN ('pending', 'approved', 'rejected')", name="ck_enrollmentrequest_status"))
        for column in ("course_id", "org_id", "user_id"):
            op.create_index(f"ix_enrollmentrequest_{column}", "enrollmentrequest", [column])
    if "lessonattendance" not in tables:
        op.create_table("lessonattendance",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("activity_id", sa.Integer(), sa.ForeignKey("activity.id", ondelete="CASCADE"), nullable=False),
            sa.Column("course_id", sa.Integer(), sa.ForeignKey("course.id", ondelete="CASCADE"), nullable=False),
            sa.Column("org_id", sa.Integer(), sa.ForeignKey("organization.id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
            sa.Column("status", sa.String(), nullable=False),
            sa.Column("grade", sa.Integer()),
            sa.Column("note", sa.String(), nullable=False),
            sa.Column("marked_by", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL")),
            sa.Column("creation_date", sa.String(), nullable=False),
            sa.Column("update_date", sa.String(), nullable=False),
            sa.UniqueConstraint("activity_id", "user_id", name="uq_lessonattendance_activity_user"),
            sa.CheckConstraint("status IN ('present', 'absent', 'excused')", name="ck_lessonattendance_status"),
            sa.CheckConstraint("grade IS NULL OR (grade >= 0 AND grade <= 100)", name="ck_lessonattendance_grade"))
        for column in ("activity_id", "course_id", "org_id", "user_id"):
            op.create_index(f"ix_lessonattendance_{column}", "lessonattendance", [column])


def downgrade():
    op.drop_table("lessonattendance")
    op.drop_table("enrollmentrequest")
