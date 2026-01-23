import React, { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronUp, User } from 'lucide-react'
import { Button, Spinner, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { buildFileUrl } from '@/common/utils/fileUtils'
import type { JobCandidateDocument } from '@/common/data/recruiting/types/jobCandidateDocumentTypes'
import { useJobCandidate } from '@/common/data/recruiting/hooks/useJobCandidate'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

interface CandidateProfileSectionProps extends BusinessAppContextProps {
  jobCandidateId: string | null
  prefixDataTestId?: string
}

export const CandidateProfileSection: React.FC<CandidateProfileSectionProps> = ({
  jobCandidateId,
  accessToken,
  userInfo,
  prefixDataTestId = 'CandidateProfileSection'
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  // Fetch full candidate data
  const { jobCandidate, loading: candidateLoading } = useJobCandidate(
    accessToken || '',
    jobCandidateId || undefined,
    'record'
  )

  // Get documents from relation
  const documents = jobCandidate?.jobCandidateDocuments || []

  // Handle picture loading
  useEffect(() => {
    if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }

    if (!jobCandidate?.picture || !accessToken) {
      setImageUrl(null)
      return
    }

    let fileInfo: any = null
    try {
      fileInfo = typeof jobCandidate.picture === 'string' ? JSON.parse(jobCandidate.picture) : jobCandidate.picture
    } catch {
      if (typeof jobCandidate.picture === 'string' && jobCandidate.picture.startsWith('data:')) {
        setImageUrl(jobCandidate.picture)
        return
      }
      setImageUrl(null)
      return
    }

    if (!fileInfo?.path) {
      setImageUrl(null)
      return
    }

    let isCancelled = false

    const fetchImage = async () => {
      try {
        const blobUrl = await buildFileUrl(fileInfo, accessToken)
        if (!isCancelled) {
          blobUrlRef.current = blobUrl
          setImageUrl(blobUrl)
        } else {
          URL.revokeObjectURL(blobUrl)
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Error fetching image:', error)
        }
      }
    }

    fetchImage()

    return () => {
      isCancelled = true
      if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [jobCandidate?.picture, accessToken])

  if (!jobCandidateId) {
    return null
  }

  const getDisplayName = (): string => {
    if (jobCandidate?.displayName) return jobCandidate.displayName
    const firstName = jobCandidate?.preferredName || jobCandidate?.firstName || ''
    const lastName = jobCandidate?.lastName || ''
    return `${firstName} ${lastName}`.trim() || 'Unknown'
  }

  const displayName = candidateLoading ? 'Loading...' : getDisplayName()

  // Helper function to render field
  const renderField = (label: string, value: any, format?: (val: any) => React.ReactNode) => {
    const formattedValue = format ? format(value) : value
    const displayValue =
      formattedValue !== null && formattedValue !== undefined && formattedValue !== '' ? formattedValue : '-'
    return (
      <div className="gba:space-y-1">
        <div className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
          {label}
        </div>
        <div className="gba:text-sm gba:font-semibold gba:text-foreground">{displayValue}</div>
      </div>
    )
  }

  // Group documents by group and type
  const groupedDocuments = React.useMemo(() => {
    if (!documents.length) return []

    const groups = new Map<string, Map<string, JobCandidateDocument[]>>()

    documents.forEach(doc => {
      const groupName = doc.documentGroup?.value || 'Other'
      const typeName = doc.documentType?.value || 'Uncategorized'

      if (!groups.has(groupName)) {
        groups.set(groupName, new Map())
      }

      const types = groups.get(groupName)!
      if (!types.has(typeName)) {
        types.set(typeName, [])
      }

      types.get(typeName)!.push(doc)
    })

    return Array.from(groups.entries()).map(([groupName, types]) => ({
      groupName,
      types: Array.from(types.entries()).map(([typeName, docs]) => ({
        typeName,
        documents: docs
      }))
    }))
  }, [documents])

  return (
    <div
      className="gba:bg-card gba:border gba:border-border gba:rounded-lg gba:overflow-hidden"
      data-testid={formatDataTestId(prefixDataTestId, 'container')}
    >
      {/* Collapsed Header */}
      <div
        className="gba:p-6 gba:flex gba:items-center gba:justify-between gba:gap-4 gba:cursor-pointer gba:hover:bg-muted/50 gba:transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid={formatDataTestId(prefixDataTestId, 'header')}
      >
        <div className="gba:flex gba:items-center gba:gap-4 gba:flex-1">
          {/* Picture */}
          <div className="gba:flex-shrink-0">
            {candidateLoading ? (
              <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:border-2 gba:border-border">
                <Spinner size="sm" />
              </div>
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt={displayName}
                className="gba:w-16 gba:h-16 gba:rounded-full gba:object-cover gba:border-2 gba:border-border"
              />
            ) : (
              <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:border-2 gba:border-border">
                <User className="gba:w-8 gba:h-8 gba:text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Name and minimal info */}
          <div className="gba:flex-1 gba:min-w-0">
            <h2 className="gba:text-lg gba:font-semibold gba:mb-1 gba:truncate">{displayName}</h2>
            {jobCandidate?.code && (
              <p className="gba:text-sm gba:text-muted-foreground gba:truncate">
                {getTranslationFromI18nKeyAndLabel('recruiting.candidateCode', 'Code')}: {jobCandidate.code}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-shrink-0">
          <AppAction
            variant="update-primary"
            contexts={[
              {
                context: FlowContextName.jobCandidateUpdate,
                contextData: { jobCandidateId, scope: 'personal', userId: userInfo?.id }
              }
            ]}
            accessToken={accessToken}
            data-testid={formatDataTestId(prefixDataTestId, 'update-profile-button')}
          >
            {getTranslationFromI18nKeyAndLabel('recruiting.portal.updateProfile', 'Update Profile')}
          </AppAction>
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            data-testid={formatDataTestId(prefixDataTestId, 'toggle-button')}
          >
            {isExpanded ? <ChevronUp className="gba:w-5 gba:h-5" /> : <ChevronDown className="gba:w-5 gba:h-5" />}
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div
          className="gba:border-t gba:border-border gba:p-6"
          data-testid={formatDataTestId(prefixDataTestId, 'expanded-content')}
        >
          {candidateLoading ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
              <Spinner size="lg" />
            </div>
          ) : jobCandidate ? (
            <div className="gba:space-y-6">
              {/* Name & Identification */}
              <Card>
                <CardHeader>
                  <CardTitle className="gba:text-base">
                    {getTranslationFromI18nKeyAndLabel('recruiting.nameIdentification', 'Name & Identification')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4">
                    {renderField(getTranslationFromI18nKeyAndLabel('recruiting.title', 'Title'), jobCandidate.title)}
                    {renderField(
                      getTranslationFromI18nKeyAndLabel('recruiting.firstName', 'First Name'),
                      jobCandidate.firstName
                    )}
                    {renderField(
                      getTranslationFromI18nKeyAndLabel('recruiting.lastName', 'Last Name'),
                      jobCandidate.lastName
                    )}
                    {renderField(
                      getTranslationFromI18nKeyAndLabel('recruiting.preferredName', 'Preferred Name'),
                      jobCandidate.preferredName
                    )}
                    {renderField(
                      getTranslationFromI18nKeyAndLabel('recruiting.birthName', 'Birth Name'),
                      jobCandidate.birthName
                    )}
                    {renderField(
                      getTranslationFromI18nKeyAndLabel('recruiting.fullName', 'Full Name'),
                      jobCandidate.fullName
                    )}
                    {renderField(
                      getTranslationFromI18nKeyAndLabel('recruiting.candidateCode', 'Candidate Code'),
                      jobCandidate.code,
                      val => (val ? <span className="gba:font-mono">{val}</span> : '-')
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="gba:text-base">
                    {getTranslationFromI18nKeyAndLabel('recruiting.personalInformation', 'Personal Information')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4">
                    {renderField(
                      getTranslationFromI18nKeyAndLabel('recruiting.salutation', 'Salutation'),
                      jobCandidate.salutation?.value
                    )}
                    {renderField(
                      getTranslationFromI18nKeyAndLabel('recruiting.gender', 'Gender'),
                      jobCandidate.gender?.value
                    )}
                    {renderField(
                      getTranslationFromI18nKeyAndLabel('recruiting.birthDate', 'Birth Date'),
                      jobCandidate.birthDate,
                      val => (val ? new Date(val).toLocaleDateString() : '-')
                    )}
                    {renderField(
                      getTranslationFromI18nKeyAndLabel('recruiting.birthPlace', 'Birth Place'),
                      jobCandidate.birthPlace
                    )}
                    {renderField(
                      getTranslationFromI18nKeyAndLabel('recruiting.nationality', 'Nationality'),
                      jobCandidate.nationality?.value
                    )}
                    {renderField(
                      getTranslationFromI18nKeyAndLabel('recruiting.maritalStatus', 'Marital Status'),
                      jobCandidate.maritalStatus?.value
                    )}
                    {renderField(
                      getTranslationFromI18nKeyAndLabel('recruiting.children', 'Children'),
                      jobCandidate.children !== undefined && jobCandidate.children !== null
                        ? jobCandidate.children
                        : '-'
                    )}
                    {renderField(
                      getTranslationFromI18nKeyAndLabel('recruiting.severelyDisabilityDegree', 'Disability Degree'),
                      jobCandidate.severelyDisabilityDegree !== undefined &&
                        jobCandidate.severelyDisabilityDegree !== null
                        ? `${jobCandidate.severelyDisabilityDegree}%`
                        : '-'
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Qualifications & Background */}
              <Card>
                <CardHeader>
                  <CardTitle className="gba:text-base">
                    {getTranslationFromI18nKeyAndLabel('recruiting.qualifications', 'Qualifications & Background')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4">
                    {renderField(
                      getTranslationFromI18nKeyAndLabel('recruiting.academicTitle', 'Academic Title'),
                      jobCandidate.academicTitle?.value
                    )}
                    {renderField(
                      getTranslationFromI18nKeyAndLabel('recruiting.schoolQualification', 'School Qualification'),
                      jobCandidate.schoolQualification?.value
                    )}
                    {renderField(
                      getTranslationFromI18nKeyAndLabel('recruiting.ethnicity', 'Ethnicity'),
                      jobCandidate.ethnicity?.value
                    )}
                    {renderField(
                      getTranslationFromI18nKeyAndLabel('recruiting.language', 'Language'),
                      jobCandidate.language?.value
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Contact & Communication */}
              <Card>
                <CardHeader>
                  <CardTitle className="gba:text-base">
                    {getTranslationFromI18nKeyAndLabel('recruiting.contactCommunication', 'Contact & Communication')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="gba:space-y-6">
                    {/* Addresses */}
                    <div>
                      <h4 className="gba:text-sm gba:font-semibold gba:mb-3 gba:text-muted-foreground">
                        {getTranslationFromI18nKeyAndLabel('recruiting.addresses', 'Addresses')}
                      </h4>
                      {jobCandidate.addresses &&
                      Array.isArray(jobCandidate.addresses) &&
                      jobCandidate.addresses.length > 0 ? (
                        <div className="gba:space-y-4">
                          {jobCandidate.addresses.map((address, idx) => (
                            <div
                              key={idx}
                              className="gba:p-3 gba:bg-muted/30 gba:rounded-lg gba:border gba:border-border"
                            >
                              {address.addressLine && (
                                <div className="gba:text-sm gba:font-medium gba:mb-1">{address.addressLine}</div>
                              )}
                              {(address.postalCode || address.locality) && (
                                <div className="gba:text-sm gba:text-muted-foreground">
                                  {address.postalCode} {address.locality}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="gba:text-sm gba:text-muted-foreground">-</p>
                      )}
                    </div>

                    {/* Communication Channels */}
                    <div>
                      <h4 className="gba:text-sm gba:font-semibold gba:mb-3 gba:text-muted-foreground">
                        {getTranslationFromI18nKeyAndLabel(
                          'recruiting.communicationChannels',
                          'Communication Channels'
                        )}
                      </h4>
                      {jobCandidate.communicationChannels &&
                      Array.isArray(jobCandidate.communicationChannels) &&
                      jobCandidate.communicationChannels.length > 0 ? (
                        <div className="gba:space-y-2">
                          {jobCandidate.communicationChannels.map((channel, idx) => (
                            <div key={idx} className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
                              {channel.communicationChannelRef && (
                                <span className="gba:font-semibold gba:min-w-[120px]">
                                  {channel.communicationChannelRef}:
                                </span>
                              )}
                              <span>{channel.value || '-'}</span>
                              {channel.valueExtension && (
                                <span className="gba:text-muted-foreground">({channel.valueExtension})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="gba:text-sm gba:text-muted-foreground">-</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Skills & Competencies */}
              <Card>
                <CardHeader>
                  <CardTitle className="gba:text-base">
                    {getTranslationFromI18nKeyAndLabel('recruiting.skillsCompetencies', 'Skills & Competencies')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {jobCandidate.skills && Array.isArray(jobCandidate.skills) && jobCandidate.skills.length > 0 ? (
                    <div className="gba:flex gba:flex-wrap gba:gap-2">
                      {jobCandidate.skills.map((skill, idx) => (
                        <div
                          key={idx}
                          className="gba:px-3 gba:py-2 gba:bg-primary/10 gba:border gba:border-primary/20 gba:rounded-md gba:text-sm"
                        >
                          <span className="gba:font-medium">{skill.skillName || skill.skillId || '-'}</span>
                          {skill.level && <span className="gba:text-muted-foreground gba:ml-2">({skill.level})</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="gba:text-sm gba:text-muted-foreground">-</p>
                  )}
                </CardContent>
              </Card>

              {/* Education */}
              <Card>
                <CardHeader>
                  <CardTitle className="gba:text-base">
                    {getTranslationFromI18nKeyAndLabel('recruiting.educations', 'Education')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {jobCandidate.educations &&
                  Array.isArray(jobCandidate.educations) &&
                  jobCandidate.educations.length > 0 ? (
                    <div className="gba:space-y-4">
                      {jobCandidate.educations.map((education, idx) => (
                        <div key={idx} className="gba:p-4 gba:bg-muted/30 gba:rounded-lg gba:border gba:border-border">
                          {education.title && (
                            <div className="gba:text-base gba:font-semibold gba:mb-1">{education.title}</div>
                          )}
                          {education.institute && <div className="gba:text-sm gba:mb-1">{education.institute}</div>}
                          {education.degree && (
                            <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">{education.degree}</div>
                          )}
                          {(education.startDate || education.endDate) && (
                            <div className="gba:text-xs gba:text-muted-foreground">
                              {education.startDate && new Date(education.startDate).toLocaleDateString()}
                              {education.startDate && education.endDate && ' - '}
                              {education.endDate && new Date(education.endDate).toLocaleDateString()}
                            </div>
                          )}
                          {education.locality && (
                            <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">{education.locality}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="gba:text-sm gba:text-muted-foreground">-</p>
                  )}
                </CardContent>
              </Card>

              {/* Certificates */}
              <Card>
                <CardHeader>
                  <CardTitle className="gba:text-base">
                    {getTranslationFromI18nKeyAndLabel('recruiting.certificates', 'Certificates')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {jobCandidate.certificates &&
                  Array.isArray(jobCandidate.certificates) &&
                  jobCandidate.certificates.length > 0 ? (
                    <div className="gba:space-y-3">
                      {jobCandidate.certificates.map((cert, idx) => (
                        <div key={idx} className="gba:p-3 gba:bg-muted/30 gba:rounded-lg gba:border gba:border-border">
                          {cert.title && <div className="gba:text-sm gba:font-semibold gba:mb-1">{cert.title}</div>}
                          {cert.institute && <div className="gba:text-sm gba:mb-1">{cert.institute}</div>}
                          {(cert.validFrom || cert.validTo) && (
                            <div className="gba:text-xs gba:text-muted-foreground">
                              {getTranslationFromI18nKeyAndLabel('recruiting.validFrom', 'Valid from')}:{' '}
                              {cert.validFrom ? new Date(cert.validFrom).toLocaleDateString() : '-'}
                              {cert.validFrom && cert.validTo && ' - '}
                              {cert.validTo ? new Date(cert.validTo).toLocaleDateString() : '-'}
                            </div>
                          )}
                          {cert.locality && (
                            <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">{cert.locality}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="gba:text-sm gba:text-muted-foreground">-</p>
                  )}
                </CardContent>
              </Card>

              {/* Professional Experience */}
              <Card>
                <CardHeader>
                  <CardTitle className="gba:text-base">
                    {getTranslationFromI18nKeyAndLabel('recruiting.professionalExperience', 'Professional Experience')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {jobCandidate.jobHistory &&
                  Array.isArray(jobCandidate.jobHistory) &&
                  jobCandidate.jobHistory.length > 0 ? (
                    <div className="gba:space-y-4">
                      {jobCandidate.jobHistory.map((job, idx) => (
                        <div key={idx} className="gba:p-4 gba:bg-muted/30 gba:rounded-lg gba:border gba:border-border">
                          {job.jobPosition && (
                            <div className="gba:text-base gba:font-semibold gba:mb-1">{job.jobPosition}</div>
                          )}
                          {job.company && <div className="gba:text-sm gba:mb-1">{job.company}</div>}
                          {(job.hireDate || job.exitDate) && (
                            <div className="gba:text-xs gba:text-muted-foreground">
                              {job.hireDate && new Date(job.hireDate).toLocaleDateString()}
                              {job.hireDate && job.exitDate && ' - '}
                              {job.exitDate && new Date(job.exitDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="gba:text-sm gba:text-muted-foreground">-</p>
                  )}
                </CardContent>
              </Card>

              {/* Additional Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="gba:text-base">
                    {getTranslationFromI18nKeyAndLabel('recruiting.additionalInformation', 'Additional Information')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="gba:space-y-4">
                    {/* Hobbies */}
                    <div>
                      <h4 className="gba:text-sm gba:font-semibold gba:mb-3 gba:text-muted-foreground">
                        {getTranslationFromI18nKeyAndLabel('recruiting.hobbies', 'Hobbies')}
                      </h4>
                      {jobCandidate.hobbies &&
                      Array.isArray(jobCandidate.hobbies) &&
                      jobCandidate.hobbies.length > 0 ? (
                        <div className="gba:flex gba:flex-wrap gba:gap-2">
                          {jobCandidate.hobbies.map((hobby, idx) => (
                            <span
                              key={idx}
                              className="gba:text-sm gba:px-3 gba:py-1.5 gba:bg-muted gba:rounded-md gba:border gba:border-border"
                            >
                              {hobby.hobby}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="gba:text-sm gba:text-muted-foreground">-</p>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <h4 className="gba:text-sm gba:font-semibold gba:mb-3 gba:text-muted-foreground">
                        {getTranslationFromI18nKeyAndLabel('recruiting.notes', 'Notes')}
                      </h4>
                      {jobCandidate.notes ? (
                        <div className="gba:p-3 gba:bg-muted/30 gba:rounded-lg gba:border gba:border-border">
                          <div className="gba:text-sm gba:whitespace-pre-wrap">{jobCandidate.notes}</div>
                        </div>
                      ) : (
                        <p className="gba:text-sm gba:text-muted-foreground">-</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="gba:text-base">
                    {getTranslationFromI18nKeyAndLabel('recruiting.documents', 'Documents')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {groupedDocuments.length > 0 ? (
                    <div className="gba:space-y-6">
                      {groupedDocuments.map(({ groupName, types }) => (
                        <div key={groupName} className="gba:space-y-3">
                          <h4 className="gba:text-sm gba:font-semibold gba:text-muted-foreground">{groupName}</h4>
                          {types.map(({ typeName, documents: typeDocs }) => (
                            <div key={typeName} className="gba:ml-4 gba:space-y-2">
                              <h5 className="gba:text-sm gba:font-medium">{typeName}</h5>
                              <ul className="gba:ml-4 gba:space-y-1">
                                {typeDocs.map(doc => (
                                  <li key={doc.id} className="gba:text-sm">
                                    {doc.name ||
                                      getTranslationFromI18nKeyAndLabel(
                                        'recruiting.unnamedDocument',
                                        'Unnamed Document'
                                      )}
                                    {doc.description && (
                                      <span className="gba:text-muted-foreground gba:ml-2">- {doc.description}</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="gba:text-sm gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel('recruiting.noDocuments', 'No documents available')}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="gba:text-center gba:text-muted-foreground gba:py-8">
              {getTranslationFromI18nKeyAndLabel('recruiting.jobCandidate.notFound', 'Job candidate not found')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
