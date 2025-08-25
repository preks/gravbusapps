import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@newwork/nw-design-system';
import { User, ExternalLink } from 'lucide-react';
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils';

	interface ContactDetailsProps {
	investmentData?: {
		investment?: {
			investmentAccount?: {
				investmentAccountContact?: Array<{
					contactType?: string | null;
					contact?: {
						id?: string | null;
						firstName?: string | null;
						lastName?: string | null;
						fullName?: string | null;
						email?: string | null;
						phone?: string | null;
						department?: string | null;
						jobPosition?: string | null;
						createdAt?: string | null;
					} | null;
				}> | null;
			} | null;
		} | null;
	} | null;
	isLoading?: boolean;
}

const ContactDetails: React.FC<ContactDetailsProps> = ({ investmentData, isLoading }) => {
	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="gba:flex gba:items-center gba:gap-2">
						<User className="gba:h-5 gba:w-5" />
						Contact
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="gba:animate-pulse gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i}>
								<div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-24 gba:mb-2"></div>
								<div className="gba:h-5 gba:bg-gray-200 gba:rounded gba:w-32"></div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	const firstLink = investmentData?.investment?.investmentAccount?.investmentAccountContact?.[0] || null;
	const c = firstLink?.contact || null;

	const contactId = c?.id || undefined;
	const fullName = c?.fullName || undefined;
	const firstName = c?.firstName || '-';
	const lastName = c?.lastName || '-';
	const email = c?.email || '-';
	const phone = c?.phone || '-';
	const jobPosition = c?.jobPosition || '-';
	const createdAt = c?.createdAt ? new Date(c.createdAt).toLocaleString('de-DE') : '-';

	return (
		<Card>
			<CardHeader>
				<div className="gba:flex gba:items-center gba:justify-between">
					<CardTitle className="gba:flex gba:items-center gba:gap-2">
						<User className="gba:h-5 gba:w-5" />
						Contact
					</CardTitle>
					{contactId && (
						<Button
							variant="ghost"
							size="sm"
							className="gba:flex gba:items-center gba:gap-1"
							onClick={() => {
								const url = buildPlatformUrl('/platform/irm/contact-record', {
									contactId
								});
								navigateTo(url);
							}}
							data-testid="contact-info-contact-link"
							aria-label="Open contact record"
						>
							<ExternalLink className="gba:h-4 gba:w-4" />
							Open Contact
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent>
				<div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3">
					<div>
						<h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">First Name</h4>
						<p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
							{fullName ? fullName.split(' ')[0] : firstName}
						</p>
					</div>
					<div>
						<h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Last Name</h4>
						<p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
							{fullName ? (fullName.split(' ').slice(1).join(' ') || '-') : lastName}
						</p>
					</div>
					<div>
						<h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Email</h4>
						{email && email !== '-' ? (
							<a
								href={`mailto:${email}`}
								className="gba:text-sm gba:font-semibold gba:text-blue-600 gba:break-all gba:overflow-hidden hover:gba:underline"
								data-testid="contact-email-link"
							>
								{email}
							</a>
						) : (
							<p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-all gba:overflow-hidden" data-testid="contact-email-value">-</p>
						)}
					</div>
					<div>
						<h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Phone Number</h4>
						{phone && phone !== '-' ? (
							<a
								href={`tel:${phone}`}
								className="gba:text-sm gba:font-semibold gba:text-blue-600 gba:break-all gba:overflow-hidden hover:gba:underline"
								data-testid="contact-phone-link"
							>
								{phone}
							</a>
						) : (
							<p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden" data-testid="contact-phone-value">-</p>
						)}
					</div>
					<div>
						<h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Position</h4>
						<p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
							{jobPosition}
						</p>
					</div>
					<div>
						<h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Created At</h4>
						<p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
							{createdAt}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

export default ContactDetails; 