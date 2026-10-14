import React, { useMemo, useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
const ReactConfetti = dynamic(() => import('react-confetti'), { ssr: false });
import { Trophy, ArrowLeft, BookOpen, Target, Download, Shield } from 'lucide-react';
import Link from 'next/link';
import { getUriWithOrg, getAbsoluteUriWithOrg } from '@services/config/config';
import { getCourseThumbnailMediaDirectory } from '@services/media/media';
import { useWindowSize } from 'usehooks-ts';
import { useOrg } from '@components/Contexts/OrgContext';
import { useLHSession } from '@components/Contexts/LHSessionContext';
import { getUserCertificates } from '@services/courses/certifications';
import CertificatePreview from '@components/Dashboard/Pages/Course/EditCourseCertification/CertificatePreview';
import {
  downloadCertificateNodeAsPdf,
  certificateFileName,
  CERTIFICATE_CAPTURE_WIDTH,
} from '@services/courses/certificateDownload';
import { useTranslation } from 'react-i18next';
import { courseProgress } from '@/lib/student-experience';
import { normalizeLocale } from '@/lib/locale';

interface CourseEndViewProps {
  courseName: string;
  orgslug: string;
  courseUuid: string;
  thumbnailImage: string;
  course: any;
  trailData: any;
}

const CourseEndView: React.FC<CourseEndViewProps> = ({ 
  courseName, 
  orgslug, 
  courseUuid, 
  thumbnailImage, 
  course, 
  trailData 
}) => {
  const { t, i18n } = useTranslation();
  const { width, height } = useWindowSize();
  const org = useOrg() as any;
  const session = useLHSession() as any;
  const [userCertificate, setUserCertificate] = useState<any>(null);
  const [isLoadingCertificate, setIsLoadingCertificate] = useState(false);
  const [certificateError, setCertificateError] = useState<string | null>(null);

  const certificateCaptureRef = useRef<HTMLDivElement>(null);

  const getLearnerName = (): string => {
    const u = userCertificate?.user;
    const full = [u?.first_name, u?.last_name].filter(Boolean).join(' ').trim();
    if (full) return full;
    if (u?.username) return u.username;
    const s = session?.data?.user;
    const sessionFull = [s?.first_name, s?.last_name].filter(Boolean).join(' ').trim();
    return sessionFull || s?.username || '';
  };
  const learnerName = getLearnerName();

  const qrCodeLink = getAbsoluteUriWithOrg(orgslug, `/certificates/${userCertificate?.certificate_user.user_certification_uuid}/verify`);

  const progressInfo = useMemo(() => courseProgress(course, trailData), [course, trailData]);
  const isCourseCompleted = progressInfo.total > 0 && progressInfo.completed === progressInfo.total;
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchUserCertificate = async () => {
      if (!isCourseCompleted) return;

      if (!session?.data?.tokens?.access_token) {
        setCertificateError(t('auth.authenticate_to_contribute'));
        return;
      }

      if (!org?.id) {
        return;
      }

      setIsLoadingCertificate(true);
      setCertificateError(null);
      try {
        const cleanCourseUuid = courseUuid.replace('course_', '');
        const result = await getUserCertificates(
          `course_${cleanCourseUuid}`,
          org.id,
          session.data.tokens.access_token
        );

        if (result.success && result.data && result.data.length > 0) {
          setUserCertificate(result.data[0]);
        } else {
          setCertificateError(t('certificate.no_certificate'));
        }
      } catch (error) {
        console.error('Error fetching user certificate:', error);
        setCertificateError(t('certificate.failed_load_certificates'));
      } finally {
        setIsLoadingCertificate(false);
      }
    };

    fetchUserCertificate();
  }, [isCourseCompleted, courseUuid, session?.data?.tokens?.access_token, org?.id]);

  const downloadCertificate = async () => {
    if (!userCertificate || isDownloading) return;
    const node = certificateCaptureRef.current;
    if (!node) return;

    setIsDownloading(true);
    try {
      await downloadCertificateNodeAsPdf(
        node,
        certificateFileName(userCertificate.certification?.config?.certification_name),
      );
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(t('certificate.download_failed'));
    } finally {
      setIsDownloading(false);
    }
  };

  const certificatePreviewProps = useMemo(() => {
    if (!userCertificate) return null;
    const config = userCertificate.certification?.config || {};
    return {
      certificationName: config.certification_name,
      certificationDescription: config.certification_description,
      certificationType: config.certification_type,
      certificatePattern: config.certificate_pattern,
      certificateInstructor: config.certificate_instructor,
      certificateId: userCertificate.certificate_user.user_certification_uuid,
      learnerName,
      awardedDate: new Date(userCertificate.certificate_user.created_at).toLocaleDateString(
        normalizeLocale(i18n.language),
        { year: 'numeric', month: 'long', day: 'numeric' },
      ),
      qrCodeLink,
    };
  }, [userCertificate, learnerName, qrCodeLink, i18n.language]);

  if (isCourseCompleted) {

    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-0 sm:px-4 relative">
        <div className="fixed inset-0 pointer-events-none">
          <ReactConfetti
            width={width}
            height={height}
            numberOfPieces={200}
            recycle={false}
            colors={['#6366f1', '#10b981', '#3b82f6']}
          />
        </div>
        
        <div className="bg-white rounded-2xl p-4 sm:p-8 nice-shadow max-w-4xl w-full space-y-6 relative z-10">
          <div className="flex flex-col items-center space-y-6">
            {thumbnailImage && (
              <img
                className="w-[200px] h-[114px] rounded-lg shadow-md object-cover"
                src={`${getCourseThumbnailMediaDirectory(
                  org?.org_uuid,
                  courseUuid,
                  thumbnailImage
                )}`}
                alt={courseName}
              />
            )}
            
            <div className="bg-emerald-100 p-4 rounded-full">
              <Trophy className="w-16 h-16 text-emerald-600" />
            </div>
          </div>
          
          <h1 className="text-2xl sm:text-4xl break-words font-bold text-gray-900">
            {t('courses.congratulations')}
          </h1>
          
          <p className="text-base sm:text-xl break-words text-gray-600">
            {t('courses.successfully_completed')}
            <span className="font-semibold text-gray-900"> {courseName}</span>
          </p>
          
          <p className="text-gray-500">
            {t('certificate.dedication_message')}
          </p>

          {isLoadingCertificate ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ms-3 text-gray-600">{t('certificate.loading_certificate')}</span>
            </div>
          ) : certificateError ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-yellow-800">
                {certificateError}
              </p>
            </div>
          ) : userCertificate && certificatePreviewProps ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900">{t('certificate.your_certificate')}</h2>
              <div className="max-w-2xl mx-auto" id="certificate-preview">
                <div id="certificate-content">
                  <CertificatePreview {...certificatePreviewProps} />
                </div>
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none fixed top-0 start-0 -z-50 opacity-0"
                style={{ transform: 'translateX(-200vw)' }}
              >
                <div ref={certificateCaptureRef} style={{ width: CERTIFICATE_CAPTURE_WIDTH }}>
                  <CertificatePreview {...certificatePreviewProps} />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
                <button
                  onClick={downloadCertificate}
                  disabled={isDownloading}
                  className="inline-flex items-center justify-center gap-2 min-h-11 text-sm whitespace-normal bg-green-600 text-white px-4 py-3 rounded-xl hover:bg-green-700 transition duration-200"
                >
                  <Download className="w-5 h-5" />
                  <span>{isDownloading ? t('student_experience.downloading') : t('certificate.download_certificate')}</span>
                </button>
                <Link
                  href={getUriWithOrg(orgslug, `/certificates/${userCertificate.certificate_user.user_certification_uuid}/verify`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 min-h-11 text-sm whitespace-normal bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition duration-200"
                >
                  <Shield className="w-5 h-5" />
                  <span>{t('certificate.verify_certificate')}</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-600">
                {t('certificate.no_certificate_available')}
              </p>
            </div>
          )}

          <div className="pt-6">
            <Link
              href={getUriWithOrg(orgslug, `/course/${courseUuid.replace('course_', '')}`)}
              className="inline-flex items-center justify-center gap-2 min-h-11 text-sm whitespace-normal bg-gray-800 text-white px-4 py-3 rounded-xl hover:bg-gray-700 transition duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>{t('courses.back_to_course')}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  } else {

    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-0 sm:px-4">
        <div className="bg-white rounded-2xl p-4 sm:p-8 nice-shadow max-w-2xl w-full space-y-6">
          <div className="flex flex-col items-center space-y-6">
            {thumbnailImage && (
              <img
                className="w-[200px] h-[114px] rounded-lg shadow-md object-cover"
                src={`${getCourseThumbnailMediaDirectory(
                  org?.org_uuid,
                  courseUuid,
                  thumbnailImage
                )}`}
                alt={courseName}
              />
            )}
            
            <div className="bg-blue-100 p-4 rounded-full">
              <Target className="w-16 h-16 text-blue-600" />
            </div>
          </div>
          
          <h1 className="text-2xl sm:text-4xl break-words font-bold text-gray-900">
            {t('courses.keep_going')}
          </h1>
          
          <p className="text-base sm:text-xl break-words text-gray-600">
            {t('courses.making_great_progress')}
            <span className="font-semibold text-gray-900"> {courseName}</span>
          </p>
          
          {progressInfo && (
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <BookOpen className="w-5 h-5 text-gray-600" />
                <span className="text-lg font-semibold text-gray-700">{t('courses.course_progress')}</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{t('courses.progress')}</span>
                  <span className="font-semibold text-gray-900">{progressInfo.percentage}%</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${progressInfo.percentage}%` }}
                  ></div>
                </div>
                
                <div className="text-sm text-gray-500">
                  {t('courses.completed_of', { completed: progressInfo.completed, total: progressInfo.total })}
                </div>
              </div>
            </div>
          )}
          
          <p className="text-gray-500">
            {t('courses.keep_going_description')}
          </p>

          <div className="pt-6">
            <Link
              href={getUriWithOrg(orgslug, `/course/${courseUuid.replace('course_', '')}`)}
              className="inline-flex items-center justify-center gap-2 min-h-11 text-sm whitespace-normal bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>{t('courses.continue_learning')}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }
};

export default CourseEndView;
