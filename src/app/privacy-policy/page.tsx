import React from 'react'
import LegalLayout from '@/components/site/LegalLayout'

export const metadata = {
  title: 'Privacy Policy — NexBrix',
  description: 'How NexBrix collects, uses, stores, shares and protects information.',
}

function H({ children }: { children: React.ReactNode }) { return <h2 className="text-[24px] sm:text-[28px] font-semibold tracking-tight text-neutral-900 mt-12 first:mt-0">{children}</h2> }
function H3({ children }: { children: React.ReactNode }) { return <h3 className="text-[17px] font-semibold tracking-tight text-neutral-900 mt-6">{children}</h3> }
function P({ children }: { children: React.ReactNode }) { return <p className="text-neutral-700">{children}</p> }
function UL({ children }: { children: React.ReactNode }) { return <ul className="list-disc pl-6 space-y-1.5 text-neutral-700 marker:text-neutral-400">{children}</ul> }

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout eyebrow="Legal" title="Privacy Policy" effectiveDate="8th June, 2026">
      <P>
        ELITE REWARDS PTY LTD (“we”, “our”, “us”) respects your privacy and is committed to protecting personal information in accordance with applicable Australian privacy laws.
      </P>
      <P>
        This Privacy Policy explains how NexBrix collects, uses, stores, shares, and protects information collected through our mobile applications, websites, web administration portals, and related services.
      </P>

      <H>1. Scope</H>
      <P>This Privacy Policy applies to:</P>
      <UL>
        <li>NexBrix mobile applications</li>
        <li>NexBrix web administration portals</li>
        <li>Websites and online services</li>
        <li>Customer support interactions</li>
        <li>Marketing communications</li>
      </UL>

      <H>2. Information We Collect</H>
      <P>We may collect and process:</P>

      <H3>Account Information</H3>
      <UL>
        <li>Name</li>
        <li>Email address</li>
        <li>Mobile number</li>
        <li>Login credentials</li>
        <li>Authentication information</li>
      </UL>

      <H3>Business Information</H3>
      <UL>
        <li>Business name</li>
        <li>Locations</li>
        <li>Supplier records</li>
        <li>Operational information</li>
        <li>Inventory information</li>
      </UL>

      <H3>Employee Information</H3>
      <P>Businesses using NexBrix may upload:</P>
      <UL>
        <li>Employee names</li>
        <li>Employee phone numbers</li>
        <li>Employee addresses</li>
        <li>Date of birth</li>
        <li>Bank details</li>
        <li>Superannuation information</li>
        <li>Timesheet information</li>
        <li>Employment-related information</li>
      </UL>

      <H3>Location Information</H3>
      <P>We may collect:</P>
      <UL>
        <li>Clock-in locations</li>
        <li>GPS information</li>
        <li>Device location information</li>
        <li>Background location information where enabled</li>
      </UL>

      <H3>Technical Information</H3>
      <UL>
        <li>Device information</li>
        <li>IP address</li>
        <li>Browser information</li>
        <li>Usage logs</li>
        <li>Error logs</li>
        <li>App analytics</li>
      </UL>

      <H3>Communications Information</H3>
      <UL>
        <li>Support requests</li>
        <li>Emails</li>
        <li>SMS interactions</li>
        <li>Notification preferences</li>
      </UL>

      <H>3. How We Use Information</H>
      <P>We use information to:</P>
      <UL>
        <li>Provide and operate NexBrix</li>
        <li>Authenticate users</li>
        <li>Manage business records</li>
        <li>Provide rostering and timesheet services</li>
        <li>Send notifications</li>
        <li>Provide support</li>
        <li>Improve services</li>
        <li>Prevent fraud and abuse</li>
        <li>Meet legal obligations</li>
      </UL>

      <H>4. Information Uploaded By Businesses</H>
      <P>
        Businesses using NexBrix are responsible for ensuring they have lawful authority, consent, or permission to upload employee, contractor, supplier, or third-party information into the Platform.
      </P>
      <P>We process uploaded information on behalf of our business customers.</P>

      <H>5. Overseas Storage and Access</H>
      <P>Information may be stored or processed using cloud infrastructure located outside Australia.</P>
      <P>Customer information may be accessed by authorised support personnel located outside Australia, including support personnel located in India.</P>
      <P>By using NexBrix, you acknowledge that overseas disclosure or access may occur.</P>

      <H>6. Security Measures</H>
      <P>We implement reasonable administrative, technical, and operational safeguards including:</P>
      <UL>
        <li>Encryption</li>
        <li>Access controls</li>
        <li>Authentication measures</li>
        <li>Monitoring systems</li>
        <li>Backup processes</li>
        <li>Security reviews</li>
      </UL>
      <P>No online platform can guarantee complete security.</P>

      <H>7. Data Retention</H>
      <P>We retain information for as long as reasonably required to:</P>
      <UL>
        <li>Provide services</li>
        <li>Meet legal obligations</li>
        <li>Resolve disputes</li>
        <li>Maintain backups</li>
        <li>Support recovery procedures</li>
      </UL>
      <P>Customers may choose:</P>
      <UL>
        <li>Account deletion</li>
        <li>Data export</li>
        <li>Extended retention services where available</li>
      </UL>

      <H>8. Marketing Communications</H>
      <P>We may send:</P>
      <UL>
        <li>Product updates</li>
        <li>Service notifications</li>
        <li>Marketing communications</li>
        <li>Push notifications</li>
        <li>SMS messages</li>
      </UL>
      <P>Users may unsubscribe from marketing communications at any time.</P>
      <P>Operational notifications may still be sent where necessary.</P>

      <H>9. Access, Correction and Deletion</H>
      <P>Users may request:</P>
      <UL>
        <li>Access to information</li>
        <li>Correction of inaccurate information</li>
        <li>Export of information</li>
        <li>Deletion requests</li>
      </UL>
      <P>Some information may be retained where legally required.</P>

      <H>10. Cookies and Analytics</H>
      <P>We may use cookies, analytics, and tracking technologies to improve services and user experience.</P>
      <P>Users may adjust browser settings where available.</P>

      <H>11. Data Breaches</H>
      <P>Where required by law, we may notify affected individuals and relevant authorities regarding eligible data breaches.</P>

      <H>12. Children and Young Workers</H>
      <P>NexBrix is intended for business use.</P>
      <P>Users under 18 may access the platform where authorised by their employer or business.</P>

      <H>13. Changes to This Policy</H>
      <P>We may update this Privacy Policy from time to time.</P>
      <P>Continued use of NexBrix constitutes acceptance of updated policies.</P>

      <H>14. Contact and Complaints</H>
      <P>Privacy enquiries or complaints may be directed to:</P>
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 not-prose">
        <p className="text-[15px] text-neutral-900 font-medium">hello@rewardshub.com.au</p>
        <p className="text-[14px] text-neutral-600 mt-1">ELITE REWARDS PTY LTD</p>
        <p className="text-[14px] text-neutral-600">Australia</p>
      </div>
      <P>If concerns cannot be resolved directly, users may contact relevant Australian privacy regulators.</P>
    </LegalLayout>
  )
}
