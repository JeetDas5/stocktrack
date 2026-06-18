import React from 'react'
import LegalLayout from '@/components/site/LegalLayout'

export const metadata = {
  title: 'Terms & Conditions — NexBrix',
  description: 'Terms governing the use of NexBrix operated by ELITE REWARDS PTY LTD.',
}

function H({ children }: { children: React.ReactNode }) { return <h2 className="text-[24px] sm:text-[28px] font-semibold tracking-tight text-neutral-900 mt-12 first:mt-0">{children}</h2> }
function P({ children }: { children: React.ReactNode }) { return <p className="text-neutral-700">{children}</p> }
function UL({ children }: { children: React.ReactNode }) { return <ul className="list-disc pl-6 space-y-1.5 text-neutral-700 marker:text-neutral-400">{children}</ul> }

export default function TermsPage() {
  return (
    <LegalLayout eyebrow="Legal" title={<>NexBrix <span className="text-neutral-400">Terms & Conditions</span></>} effectiveDate="8th June, 2026">
      <P>
        These Terms and Conditions (“Terms”) govern the use of NexBrix (“Platform”, “Software”, “Service”) operated by ELITE REWARDS PTY LTD (“we”, “our”, “us”).
      </P>
      <P>By creating an account, accessing, or using NexBrix, you agree to these Terms.</P>

      <H>1. Eligibility</H>
      <P>
        NexBrix is intended for business use. Users under 18 years of age may use the Platform only under the authority or supervision of their employer, business owner, or authorised representative.
      </P>

      <H>2. Description of Service</H>
      <P>
        NexBrix is business assistance software designed to support stock management, inventory counting, reporting, staff management, and related operational activities.
      </P>
      <P>
        We do not guarantee that the Platform will meet every business requirement or replace professional business, accounting, payroll, or operational advice.
      </P>

      <H>3. User Accounts</H>
      <P>You are responsible for:</P>
      <UL>
        <li>Maintaining the security of your account credentials</li>
        <li>Restricting access to authorised users only</li>
        <li>Removing former employees or users from your account</li>
        <li>Ensuring data entered into the Platform is accurate</li>
      </UL>
      <P>You are responsible for all activity occurring under your account.</P>

      <H>4. Data Ownership</H>
      <P>You retain ownership of your business data entered into NexBrix.</P>
      <P>You grant us permission to store, process, back up, transmit, and analyse your data solely for the purpose of providing the Service.</P>

      <H>5. Data Storage, Backups and Recovery</H>
      <P>We use third-party cloud infrastructure and service providers to host and operate the Platform.</P>
      <P>While we implement automated backup and recovery processes, data availability, recovery, or retention cannot be guaranteed.</P>
      <P>You acknowledge that:</P>
      <UL>
        <li>Data loss, corruption, deletion, or service interruptions may occur</li>
        <li>Backup restoration attempts are provided on a best-effort basis</li>
        <li>Customers should maintain their own copies of critical business information</li>
      </UL>
      <P>ELITE REWARDS PTY LTD is not responsible for losses arising from unavailable, corrupted, incomplete, or deleted data.</P>

      <H>6. Third-Party Providers</H>
      <P>The Platform may rely on third-party services including hosting providers, authentication providers, notification systems, cloud storage, payment processors, or messaging services.</P>
      <P>We are not liable for failures, outages, interruptions, or losses caused by third-party services.</P>

      <H>7. Security</H>
      <P>We implement reasonable administrative, technical, and operational safeguards to protect data.</P>
      <P>However:</P>
      <UL>
        <li>No online service is completely secure</li>
        <li>We cannot guarantee protection against hacking, malware, cyberattacks, or unauthorised access</li>
        <li>Users remain responsible for maintaining account security</li>
      </UL>

      <H>8. User Actions and Internal Staff Activity</H>
      <P>You are responsible for actions taken by your employees, contractors, managers, or authorised users.</P>
      <P>We are not responsible for:</P>
      <UL>
        <li>Data deleted by your staff</li>
        <li>Incorrect stock counts</li>
        <li>Permission misconfiguration</li>
        <li>User error</li>
        <li>Operational decisions made using Platform information</li>
      </UL>

      <H>9. Availability and Downtime</H>
      <P>We do not guarantee uninterrupted access.</P>
      <P>Services may be unavailable due to:</P>
      <UL>
        <li>Maintenance</li>
        <li>Infrastructure issues</li>
        <li>Network failures</li>
        <li>Third-party outages</li>
        <li>Unexpected incidents</li>
      </UL>
      <P>Features may change, be modified, or removed without notice.</P>

      <H>10. Fees, Trials and Refunds</H>
      <P>Free plans, trial periods, and pricing may change.</P>
      <P>Subscription cancellations may qualify for prorated refunds in accordance with our refund policy.</P>
      <P>We reserve the right to modify pricing or plans.</P>

      <H>11. Limitation of Liability</H>
      <P>To the maximum extent permitted by law:</P>
      <P>ELITE REWARDS PTY LTD is not liable for:</P>
      <UL>
        <li>Lost profits</li>
        <li>Lost revenue</li>
        <li>Business interruption</li>
        <li>Loss of customers</li>
        <li>Loss of goodwill</li>
        <li>Indirect or consequential damages</li>
        <li>Data loss or corruption</li>
        <li>Operational decisions based on Platform information</li>
      </UL>
      <P>Our total liability is limited to the fees paid by you to us during the previous 12 months.</P>

      <H>12. Australian Consumer Law</H>
      <P>Nothing in these Terms excludes rights that cannot legally be excluded under Australian Consumer Law.</P>
      <P>Where permitted, our liability is limited to supplying the services again or refunding the amount paid.</P>

      <H>13. Suspension and Termination</H>
      <P>We may suspend or terminate accounts for:</P>
      <UL>
        <li>Abuse</li>
        <li>Illegal activities</li>
        <li>Security risks</li>
        <li>Breaches of these Terms</li>
        <li>Non-payment</li>
      </UL>

      <H>14. Governing Law</H>
      <P>These Terms are governed by the laws of Western Australia and Australia.</P>
      <P>Any disputes shall be handled within Australian courts.</P>

      <H>15. Contact</H>
      <P>Questions regarding these Terms may be sent to:</P>
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 not-prose">
        <p className="text-[15px] text-neutral-900 font-medium">hello@rewardshub.com.au</p>
        <p className="text-[14px] text-neutral-600 mt-1">ELITE REWARDS PTY LTD</p>
        <p className="text-[14px] text-neutral-600">Australia</p>
      </div>
    </LegalLayout>
  )
}
