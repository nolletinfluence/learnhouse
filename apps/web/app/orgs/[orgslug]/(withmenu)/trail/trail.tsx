'use client'

import FeatureGate from '@components/Dashboard/Shared/FeatureGate/FeatureGate'
import GeneralWrapperStyled from '@components/Objects/StyledElements/Wrappers/GeneralWrapper'
import StudentLearningHome from '@components/Pages/Trail/StudentLearningHome'

export default function Trail({ orgslug }: { orgslug: string }) {
  return <FeatureGate feature="courses" orgslug={orgslug} context="public">
    <GeneralWrapperStyled><StudentLearningHome orgslug={orgslug} progressPage /></GeneralWrapperStyled>
  </FeatureGate>
}
