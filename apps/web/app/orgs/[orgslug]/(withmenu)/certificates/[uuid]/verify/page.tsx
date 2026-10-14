import CertificateVerificationPage from '@components/Pages/Certificate/CertificateVerificationPage';
import React from 'react';
import { Metadata } from 'next';
import { serverLocale } from '@/lib/locale-server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await serverLocale();
  return {
    title: locale === 'ru' ? 'Проверка сертификата — BestDevs' : 'Certificate verification — BestDevs',
    robots: { index: false, follow: false },
  };
}

interface CertificateVerifyPageProps {
  params: Promise<{
    uuid: string;
  }>;
}

const CertificateVerifyPage: React.FC<CertificateVerifyPageProps> = async ({ params }) => {
  const { uuid } = await params;
  return <CertificateVerificationPage certificateUuid={uuid} />;
};

export default CertificateVerifyPage;
