import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { User, Hash, Calendar, MapPin, Phone, Briefcase, FileText, GraduationCap, Award } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { JobCandidate } from '@/common/data/recruiting/types/jobCandidateTypes'
import { renderCommunicationChannels } from '@/common/utils/communicationChannelRenderer'
import { formatAddress } from '@/common/utils/addressFormatter'

interface HomeViewProps extends BusinessAppContextProps {
  jobCandidate: JobCandidate | null
}

const FieldDisplay: React.FC<{
  label: string
  value: string | number | null | undefined
  icon?: React.ElementType
}> = ({ label, value, icon: Icon }) => {
  if (!value) return null

  return (
    <div className="gba:space-y-1">
      <div className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
        {Icon && <Icon className="gba:h-4 gba:w-4" />}
        {label}
      </div>
      <div className="gba:text-base">{value}</div>
    </div>
  )
}

export const HomeView: React.FC<HomeViewProps> = ({ jobCandidate }) => {
  if (!jobCandidate) {
    return (
      <div className="gba:p-6 gba:text-center gba:text-muted-foreground">
        {getTranslationFromI18nKeyAndLabel('recruiting.jobCandidate.notFound', 'Job candidate not found')}
      </div>
    )
  }

  const communicationChannels = renderCommunicationChannels(jobCandidate.communicationChannels)
  const primaryAddress = jobCandidate.addresses?.[0]

  return (
    <>
      {/* Personal Information Card */}
      <Card
        className="gba:col-span-1 gba:sm:col-span-6 gba:md:col-span-6 gba:lg:col-span-6"
        data-testid="job-candidate-personal-info-card"
      >
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <User className="gba:h-5 gba:w-5" />
            {getTranslationFromI18nKeyAndLabel('recruiting.personalInformation', 'Personal Information')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:grid-cols-1 gba:gap-6">
            <FieldDisplay label="Preferred Name" value={jobCandidate.preferredName} />
            <FieldDisplay label="Salutation" value={jobCandidate.salutation?.value || jobCandidate.salutationRef} />
            <FieldDisplay label="Title" value={jobCandidate.title} />
            <FieldDisplay label="Birth Name" value={jobCandidate.birthName} />
            <FieldDisplay
              label="Birth Date"
              value={jobCandidate.birthDate ? new Date(jobCandidate.birthDate).toLocaleDateString() : null}
            />
            <FieldDisplay label="Birth Place" value={jobCandidate.birthPlace} />
            <FieldDisplay label="Gender" value={jobCandidate.gender?.value || jobCandidate.genderRef} />
            <FieldDisplay label="Nationality" value={jobCandidate.nationality?.value || jobCandidate.nationalityRef} />
            <FieldDisplay
              label="Marital Status"
              value={jobCandidate.maritalStatus?.value || jobCandidate.maritalStatusRef}
            />
            <FieldDisplay label="Number of Children" value={jobCandidate.children} />
            <FieldDisplay
              label="Academic Title"
              value={jobCandidate.academicTitle?.value || jobCandidate.academicTitleRef}
            />
            <FieldDisplay label="Ethnicity" value={jobCandidate.ethnicity?.value || jobCandidate.ethnicityRef} />
            <FieldDisplay label="Language" value={jobCandidate.language?.value || jobCandidate.languageRef} />
            <FieldDisplay
              label="School Qualification"
              value={jobCandidate.schoolQualification?.value || jobCandidate.schoolQualificationRef}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Information Card */}
      <Card
        className="gba:col-span-1 gba:sm:col-span-6 gba:md:col-span-6 gba:lg:col-span-6"
        data-testid="job-candidate-contact-info-card"
      >
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Phone className="gba:h-5 gba:w-5" />
            {getTranslationFromI18nKeyAndLabel('recruiting.contactInformation', 'Contact Information')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-6">
            {/* Communication Channels */}
            {communicationChannels.length > 0 && (
              <div className="gba:space-y-3">
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">Communication Channels</div>
                {communicationChannels.map((channel, index) => {
                  const Icon = channel.icon
                  return (
                    <div key={index} className="gba:flex gba:items-center gba:gap-2">
                      <Icon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                      <span className="gba:text-sm gba:font-medium gba:min-w-[80px]">{channel.title}:</span>
                      {channel.render(channel.value)}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Primary Address */}
            {primaryAddress && (
              <div className="gba:space-y-2">
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                  <MapPin className="gba:h-4 gba:w-4" />
                  Address
                </div>
                <div className="gba:text-sm gba:whitespace-pre-line">
                  {formatAddress({
                    addressLine: primaryAddress.addressLine,
                    locality: primaryAddress.locality,
                    postalCode: primaryAddress.postalCode,
                    region: primaryAddress.regionRef,
                    country: primaryAddress.countryRef
                  })}
                </div>
              </div>
            )}

            {communicationChannels.length === 0 && !primaryAddress && (
              <div className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('common.noDataAvailable', 'No contact information available')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Professional Information Card */}
      <Card
        className="gba:col-span-1 gba:sm:col-span-6 gba:md:col-span-6 gba:lg:col-span-6"
        data-testid="job-candidate-professional-info-card"
      >
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Briefcase className="gba:h-5 gba:w-5" />
            {getTranslationFromI18nKeyAndLabel('recruiting.professionalInformation', 'Professional Information')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:grid-cols-1 gba:gap-6">
            <FieldDisplay label="Candidate Code" value={jobCandidate.code} icon={Hash} />
            <FieldDisplay label="Job Candidate Status" value={jobCandidate.jobCandidateStatus} />
            <FieldDisplay label="Severely Disability Degree" value={jobCandidate.severelyDisabilityDegree} />
          </div>
        </CardContent>
      </Card>

      {/* Status & Source Card */}
      <Card
        className="gba:col-span-1 gba:sm:col-span-6 gba:md:col-span-6 gba:lg:col-span-6"
        data-testid="job-candidate-status-card"
      >
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <FileText className="gba:h-5 gba:w-5" />
            {getTranslationFromI18nKeyAndLabel('recruiting.statusAndNotes', 'Status & Notes')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-6">
            {jobCandidate.notes && (
              <div className="gba:space-y-2">
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">Notes</div>
                <div className="gba:text-sm gba:whitespace-pre-line">{jobCandidate.notes}</div>
              </div>
            )}

            {!jobCandidate.notes && (
              <div className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('common.noDataAvailable', 'No notes available')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Education History Card - Full width */}
      <Card
        className="gba:col-span-1 gba:sm:col-span-12 gba:md:col-span-12 gba:lg:col-span-12"
        data-testid="job-candidate-education-card"
      >
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <GraduationCap className="gba:h-5 gba:w-5" />
            {getTranslationFromI18nKeyAndLabel('recruiting.educationHistory', 'Education History')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobCandidate.educations && jobCandidate.educations.length > 0 ? (
            <div className="gba:space-y-4">
              {jobCandidate.educations.map((education, index) => (
                <Card key={`education-${index}`} variant="outlined">
                  <CardContent className="gba:pt-4">
                    <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                      {education.title && (
                        <div className="gba:space-y-1">
                          <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">Field of Study</div>
                          <div className="gba:text-base gba:font-semibold">{education.title}</div>
                        </div>
                      )}
                      {education.institute && (
                        <div className="gba:space-y-1">
                          <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">Institute</div>
                          <div className="gba:text-base">{education.institute}</div>
                        </div>
                      )}
                      {education.degree && (
                        <div className="gba:space-y-1">
                          <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">Degree</div>
                          <div className="gba:text-base">{education.degree}</div>
                        </div>
                      )}
                      {(education.startDate || education.endDate) && (
                        <div className="gba:space-y-1">
                          <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">Period</div>
                          <div className="gba:text-base">
                            {education.startDate
                              ? new Date(education.startDate).toLocaleDateString()
                              : 'Start date not specified'}{' '}
                            -{' '}
                            {education.endDate
                              ? new Date(education.endDate).toLocaleDateString()
                              : 'End date not specified'}
                          </div>
                        </div>
                      )}
                      {education.locality && (
                        <div className="gba:space-y-1">
                          <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">Location</div>
                          <div className="gba:text-base">{education.locality}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4">
              {getTranslationFromI18nKeyAndLabel('recruiting.noEducationRecords', 'No education records available')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certificates Card - Full width */}
      <Card
        className="gba:col-span-1 gba:sm:col-span-12 gba:md:col-span-12 gba:lg:col-span-12"
        data-testid="job-candidate-certificates-card"
      >
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Award className="gba:h-5 gba:w-5" />
            {getTranslationFromI18nKeyAndLabel('recruiting.certificates', 'Certificates & Certifications')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobCandidate.certificates && jobCandidate.certificates.length > 0 ? (
            <div className="gba:space-y-4">
              {jobCandidate.certificates.map((certificate, index) => (
                <Card key={`certificate-${index}`} variant="outlined">
                  <CardContent className="gba:pt-4">
                    <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                      {certificate.title && (
                        <div className="gba:space-y-1">
                          <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">Certificate Title</div>
                          <div className="gba:text-base gba:font-semibold">{certificate.title}</div>
                        </div>
                      )}
                      {certificate.institute && (
                        <div className="gba:space-y-1">
                          <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                            Issuing Organization
                          </div>
                          <div className="gba:text-base">{certificate.institute}</div>
                        </div>
                      )}
                      {(certificate.validFrom || certificate.validTo) && (
                        <div className="gba:space-y-1">
                          <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">Validity Period</div>
                          <div className="gba:text-base">
                            {certificate.validFrom
                              ? new Date(certificate.validFrom).toLocaleDateString()
                              : 'Issue date not specified'}{' '}
                            -{' '}
                            {certificate.validTo ? new Date(certificate.validTo).toLocaleDateString() : 'No expiration'}
                          </div>
                        </div>
                      )}
                      {certificate.locality && (
                        <div className="gba:space-y-1">
                          <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">Location</div>
                          <div className="gba:text-base">{certificate.locality}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4">
              {getTranslationFromI18nKeyAndLabel(
                'recruiting.noCertificates',
                'No certificates or certifications available'
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Information Card - Full width */}
      <Card
        className="gba:col-span-1 gba:sm:col-span-12 gba:md:col-span-12 gba:lg:col-span-12"
        data-testid="job-candidate-audit-card"
      >
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Calendar className="gba:h-5 gba:w-5" />
            {getTranslationFromI18nKeyAndLabel('recruiting.auditInfo', 'Record Information')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-6">
            <FieldDisplay
              label="Created At"
              value={jobCandidate.createdAt ? new Date(jobCandidate.createdAt).toLocaleString() : null}
            />
            <FieldDisplay
              label="Updated At"
              value={jobCandidate.updatedAt ? new Date(jobCandidate.updatedAt).toLocaleString() : null}
            />
          </div>
        </CardContent>
      </Card>
    </>
  )
}
