"use client";

import Image from "next/image";
import { toast } from "sonner";
import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Camera,
  MapPin,
  FileText,
  Briefcase,
  User,
  HeartHandshake,
  Calendar as CalendarIcon,
} from "lucide-react";

import Calendar from "@/components/ui/calendar";
import { useAuth } from "@/providers/auth-provider";
import { updateMeProfile } from "@/lib/repositories/user.repository";
import { getMyStaffProfile } from "@/lib/repositories/staff.repository";
import { Dropdown } from "@/components/ui/dropdown";
import { useBusinessStore } from "@/stores/business-store";
import { useLocationStore } from "@/stores/location-store";
import type { Staff } from "@/types/staff";

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
  { value: "Prefer not to say", label: "Prefer not to say" },
] as const;

export default function ProfilePage() {
  const { profile, loading: authLoading, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  const { activeBusinessId } = useBusinessStore();
  const { locations, fetchLocations } = useLocationStore();
  const [myStaffProfile, setMyStaffProfile] = useState<Staff | null>(null);

  useEffect(() => {
    if (activeBusinessId) {
      fetchLocations(activeBusinessId);
      getMyStaffProfile(activeBusinessId)
        .then(setMyStaffProfile)
        .catch(() => {
          // Not all users have a staff record (e.g. business owner); silently ignore
        });
    }
  }, [activeBusinessId, fetchLocations]);

  const assignedLocations = useMemo(() => {
    if (!profile) return [];

    if (profile.role === "admin" || profile.role === "super_admin") {
      return locations;
    }

    if (myStaffProfile?.locations) {
      return myStaffProfile.locations;
    }

    return [];
  }, [profile, locations, myStaffProfile]);

  const [openSections, setOpenSections] = useState({
    personal: true,
    emergency: true,
    payroll: true,
    employment: true,
  });

  const [showTFN, setShowTFN] = useState(false);
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  const [showDOBCalendar, setShowDOBCalendar] = useState(false);
  const [showLicenseCalendar, setShowLicenseCalendar] = useState(false);
  const [showVisaCalendar, setShowVisaCalendar] = useState(false);

  const dobCalendarRef = useRef<HTMLDivElement>(null);
  const licenseCalendarRef = useRef<HTMLDivElement>(null);
  const visaCalendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dobCalendarRef.current &&
        !dobCalendarRef.current.contains(event.target as Node)
      ) {
        setShowDOBCalendar(false);
      }
      if (
        licenseCalendarRef.current &&
        !licenseCalendarRef.current.contains(event.target as Node)
      ) {
        setShowLicenseCalendar(false);
      }
      if (
        visaCalendarRef.current &&
        !visaCalendarRef.current.contains(event.target as Node)
      ) {
        setShowVisaCalendar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    gender: "",
    date_of_birth: "",
    address_line1: "",
    country: "",
    suburb: "",
    state: "",
    post_code: "",
    driving_license_number: "",
    license_expiry_date: "",

    // Emergency Contact
    emergency_contact_name: "",
    emergency_contact_relationship: "",
    emergency_contact_phone: "",
    emergency_contact_email: "",

    // Payroll
    tax_file_number: "",
    super_fund_name: "",
    super_fund_member_no: "",
    bank_account_name: "",
    bank_bsb: "",
    bank_account_number: "",
    weekly_work_hours: 0,
    residency_status: "",
    visa_expiry_date: "",

    // Employment (Read-only)
    employee_id: "",
    role: "",
    position: "",
    start_date: "",
    reports_to: "",
    employment_type: "",
  });

  // Load Form from Profile
  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        phone: profile.phone || "",
        email: profile.email || "",
        gender: profile.gender || "Male",
        date_of_birth: profile.date_of_birth || "",
        address_line1: profile.address_line1 || "",
        country: profile.country || "",
        suburb: profile.suburb || "",
        state: profile.state || "",
        post_code: profile.post_code || "",
        driving_license_number: profile.driving_license_number || "",
        license_expiry_date: profile.license_expiry_date || "",

        emergency_contact_name: profile.emergency_contact_name || "",
        emergency_contact_relationship:
          profile.emergency_contact_relationship || "",
        emergency_contact_phone: profile.emergency_contact_phone || "",
        emergency_contact_email: profile.emergency_contact_email || "",

        tax_file_number: profile.tax_file_number || "",
        super_fund_name: profile.super_fund_name || "",
        super_fund_member_no: profile.super_fund_member_no || "",
        bank_account_name: profile.bank_account_name || "",
        bank_bsb: profile.bank_bsb || "",
        bank_account_number: profile.bank_account_number || "",
        weekly_work_hours: profile.weekly_work_hours || 0,
        residency_status: profile.residency_status || "",
        visa_expiry_date: profile.visa_expiry_date || "",

        employee_id: profile.employee_id || "",
        role: profile.role || "staff",
        position: profile.position || "",
        start_date: profile.createdAt
          ? new Date(profile.createdAt).toLocaleDateString()
          : "",
        reports_to: profile.reports_to || "Manager",
        employment_type: profile.employment_type || "Casual",
      });
    }
  }, [profile]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Form Field Change Handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "weekly_work_hours"
          ? value === ""
            ? 0
            : Number(value)
          : value,
    }));
  };

  // Profile Completion Score Calculator
  const completionStats = useMemo(() => {
    const fieldsToTrack = [
      "first_name",
      "last_name",
      "phone",
      "gender",
      "date_of_birth",
      "address_line1",
      "country",
      "suburb",
      "state",
      "post_code",
      "driving_license_number",
      "license_expiry_date",
      "emergency_contact_name",
      "emergency_contact_relationship",
      "emergency_contact_phone",
      "emergency_contact_email",
      "tax_file_number",
      "super_fund_name",
      "super_fund_member_no",
      "bank_account_name",
      "bank_bsb",
      "bank_account_number",
      "residency_status",
      "visa_expiry_date",
    ];

    const filledCount = fieldsToTrack.reduce((acc, field) => {
      const val = formData[field as keyof typeof formData];
      return acc + (val && String(val).trim() !== "" ? 1 : 0);
    }, 0);

    const percentage = Math.round((filledCount / fieldsToTrack.length) * 100);
    return { percentage };
  }, [formData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name.trim()) {
      toast.error("First Name is required.");
      return;
    }
    if (!formData.phone.trim()) {
      toast.error("Mobile Number is required.");
      return;
    }
    if (!formData.emergency_contact_name.trim()) {
      toast.error("Emergency Contact Name is required.");
      return;
    }
    if (!formData.emergency_contact_phone.trim()) {
      toast.error("Emergency Contact Phone is required.");
      return;
    }

    try {
      setSaving(true);
      await updateMeProfile({
        ...profile,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: formData.phone.trim(),
        gender: formData.gender,
        date_of_birth: formData.date_of_birth,
        address_line1: formData.address_line1.trim(),
        country: formData.country.trim(),
        suburb: formData.suburb.trim(),
        state: formData.state.trim(),
        post_code: formData.post_code.trim(),
        driving_license_number: formData.driving_license_number.trim(),
        license_expiry_date: formData.license_expiry_date,

        emergency_contact_name: formData.emergency_contact_name.trim(),
        emergency_contact_relationship:
          formData.emergency_contact_relationship.trim(),
        emergency_contact_phone: formData.emergency_contact_phone.trim(),
        emergency_contact_email: formData.emergency_contact_email.trim(),

        tax_file_number: formData.tax_file_number.trim(),
        super_fund_name: formData.super_fund_name.trim(),
        super_fund_member_no: formData.super_fund_member_no.trim(),
        bank_account_name: formData.bank_account_name.trim(),
        bank_bsb: formData.bank_bsb.trim(),
        bank_account_number: formData.bank_account_number.trim(),
        weekly_work_hours: formData.weekly_work_hours,
        residency_status: formData.residency_status.trim(),
        visa_expiry_date: formData.visa_expiry_date,
      } as any);

      toast.success("Profile saved successfully.");
      await refreshProfile();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to save profile. Please check validation errors.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        phone: profile.phone || "",
        email: profile.email || "",
        gender: profile.gender || "Male",
        date_of_birth: profile.date_of_birth || "",
        address_line1: profile.address_line1 || "",
        country: profile.country || "",
        suburb: profile.suburb || "",
        state: profile.state || "",
        post_code: profile.post_code || "",
        driving_license_number: profile.driving_license_number || "",
        license_expiry_date: profile.license_expiry_date || "",

        emergency_contact_name: profile.emergency_contact_name || "",
        emergency_contact_relationship:
          profile.emergency_contact_relationship || "",
        emergency_contact_phone: profile.emergency_contact_phone || "",
        emergency_contact_email: profile.emergency_contact_email || "",

        tax_file_number: profile.tax_file_number || "",
        super_fund_name: profile.super_fund_name || "",
        super_fund_member_no: profile.super_fund_member_no || "",
        bank_account_name: profile.bank_account_name || "",
        bank_bsb: profile.bank_bsb || "",
        bank_account_number: profile.bank_account_number || "",
        weekly_work_hours: profile.weekly_work_hours || 0,
        residency_status: profile.residency_status || "",
        visa_expiry_date: profile.visa_expiry_date || "",

        employee_id: profile.employee_id || "",
        role: profile.role || "staff",
        position: profile.position || "",
        start_date: profile.createdAt
          ? new Date(profile.createdAt).toLocaleDateString()
          : "",
        reports_to: profile.reports_to || "Jane Smith (Store Manager)",
        employment_type: profile.employment_type || "Casual",
      });
      toast.info("Changes discarded.");
    }
  };

  if (authLoading) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center bg-white text-[#0F172A]">
        <Loader2 className="h-7 w-7 text-[#0a2924] animate-spin mb-3" />
        <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Retrieving profile details...
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-[85vh] select-none pb-10">
      <form
        onSubmit={handleSave}
        className="max-w-6xl mx-auto space-y-6 px-4 md:px-6"
      >
        <div className="bg-white border border-[#E2E8F0] rounded-2xl py-5 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xs">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-zinc-900 tracking-tight">
              My Profile
            </h1>
            <p className="text-zinc-400 text-[10px] font-bold mt-1 uppercase tracking-wide">
              Last Updated:{" "}
              {profile?.updated_at
                ? new Date(profile.updated_at).toLocaleString()
                : "Never"}
            </p>
          </div>

          <div className="w-full sm:w-64">
            <div className="flex justify-between items-center text-xs font-extrabold text-[#0a2924] mb-1.5">
              <span>Profile Completion</span>
              <span>{completionStats.percentage}%</span>
            </div>
            <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/50">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completionStats.percentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-visible">
          <button
            type="button"
            onClick={() => toggleSection("personal")}
            className={`w-full flex justify-between items-center px-6 py-4.5 bg-zinc-50/50 hover:bg-zinc-50/80 transition-colors text-left rounded-t-2xl ${
              openSections.personal ? "border-b border-zinc-100" : "rounded-b-2xl"
            }`}
          >
            <div className="flex items-center gap-3">
              <User className="h-4.5 w-4.5 text-[#0a2924]" />
              <span className="text-sm font-extrabold text-zinc-900 tracking-wide uppercase">
                1. Personal Details
              </span>
            </div>
            <ChevronDown
              className={`h-4.5 w-4.5 text-zinc-400 transition-transform duration-350 ease-out ${
                openSections.personal ? "rotate-180" : ""
              }`}
            />
          </button>

          <div
            className={`accordion-grid ${openSections.personal ? "accordion-grid-open" : ""}`}
          >
            <div className="accordion-grid-inner">
              <div className="p-6 flex flex-col lg:flex-row gap-8">
                <div className="flex flex-col items-center lg:items-start shrink-0">
                  <span className="text-xs font-bold text-zinc-500 mb-3 uppercase tracking-wider">
                    Profile Photo
                  </span>
                  <div className="relative h-32 w-32 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center shadow-inner overflow-hidden group">
                    {profile?.image ? (
                      <Image
                        src={profile.image}
                        alt="Profile"
                        width={100}
                        height={100}
                        loading="eager"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-400">
                        <Camera className="h-7 w-7 text-zinc-300 mb-1" />
                        <span className="text-[9px] font-extrabold tracking-wide uppercase text-zinc-400">
                          No Image
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-400 font-semibold mt-3 text-center lg:text-left leading-relaxed max-w-[150px]">
                    Photo cannot be modified by user
                  </span>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      required
                      placeholder="Enter First Name"
                      value={formData.first_name}
                      onChange={handleChange}
                      className="w-full bg-white border border-zinc-200 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all shadow-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      placeholder="Enter Last Name"
                      value={formData.last_name}
                      onChange={handleChange}
                      className="w-full bg-white border border-zinc-200 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all shadow-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                      Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="phone"
                      required
                      placeholder="Enter Mobile Number"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full bg-white border border-zinc-200 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all shadow-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      disabled
                      value={formData.email}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 px-3.5 text-xs text-zinc-400 cursor-not-allowed select-none font-bold outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                      Gender <span className="text-rose-500">*</span>
                    </label>
                    <Dropdown
                      value={formData.gender}
                      onChange={(val) =>
                        setFormData((prev) => ({ ...prev, gender: val }))
                      }
                      options={GENDER_OPTIONS}
                      className="w-full"
                      triggerClassName="rounded-xl py-2.5 px-3.5 border-zinc-200 font-bold text-zinc-950"
                      optionClassName="font-bold text-zinc-700"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                      Date of Birth
                    </label>
                    <div ref={dobCalendarRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setShowDOBCalendar(!showDOBCalendar)}
                        className="w-full flex justify-between items-center bg-white border border-zinc-200 text-xs hover:bg-zinc-50/50 transition-colors focus:outline-none focus:ring-1 focus:ring-[#0a2924] focus:border-[#0a2924] cursor-pointer rounded-xl py-2.5 px-3.5 shadow-xs font-bold"
                      >
                        <span
                          className={
                            formData.date_of_birth
                              ? "text-zinc-950"
                              : "text-zinc-400"
                          }
                        >
                          {formData.date_of_birth || "Select date"}
                        </span>
                        <CalendarIcon className="h-4 w-4 text-zinc-400" />
                      </button>

                      {showDOBCalendar && (
                        <Calendar
                          selectedDate={formData.date_of_birth}
                          onChange={(dateStr) => {
                            setFormData((prev) => ({
                              ...prev,
                              date_of_birth: dateStr,
                            }));
                            setShowDOBCalendar(false);
                          }}
                          className="right-0 top-full mt-1.5"
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
                    <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                      Address Line 1
                    </label>
                    <input
                      type="text"
                      name="address_line1"
                      placeholder="Street address, P.O. Box, etc."
                      value={formData.address_line1}
                      onChange={handleChange}
                      className="w-full bg-white border border-zinc-200 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all shadow-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                      Country
                    </label>
                    <input
                      type="text"
                      name="country"
                      placeholder="e.g. Australia"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full bg-white border border-zinc-200 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all shadow-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                      Suburb
                    </label>
                    <input
                      type="text"
                      name="suburb"
                      placeholder="e.g. Richmond"
                      value={formData.suburb}
                      onChange={handleChange}
                      className="w-full bg-white border border-zinc-200 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all shadow-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                      State
                    </label>
                    <input
                      type="text"
                      name="state"
                      placeholder="e.g. Victoria"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full bg-white border border-zinc-200 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all shadow-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                      Post Code
                    </label>
                    <input
                      type="text"
                      name="post_code"
                      placeholder="e.g. 3121"
                      value={formData.post_code}
                      onChange={handleChange}
                      className="w-full bg-white border border-zinc-200 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all shadow-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                      Driving License Number
                    </label>
                    <input
                      type="text"
                      name="driving_license_number"
                      placeholder="License ID"
                      value={formData.driving_license_number}
                      onChange={handleChange}
                      className="w-full bg-white border border-zinc-200 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all shadow-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                      License Expiry Date
                    </label>
                    <div ref={licenseCalendarRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setShowLicenseCalendar(!showLicenseCalendar)}
                        className="w-full flex justify-between items-center bg-white border border-zinc-200 text-xs hover:bg-zinc-50/50 transition-colors focus:outline-none focus:ring-1 focus:ring-[#0a2924] focus:border-[#0a2924] cursor-pointer rounded-xl py-2.5 px-3.5 shadow-xs font-bold"
                      >
                        <span
                          className={
                            formData.license_expiry_date
                              ? "text-zinc-950"
                              : "text-zinc-400"
                          }
                        >
                          {formData.license_expiry_date || "Select date"}
                        </span>
                        <CalendarIcon className="h-4 w-4 text-zinc-400" />
                      </button>

                      {showLicenseCalendar && (
                        <Calendar
                          selectedDate={formData.license_expiry_date}
                          onChange={(dateStr) => {
                            setFormData((prev) => ({
                              ...prev,
                              license_expiry_date: dateStr,
                            }));
                            setShowLicenseCalendar(false);
                          }}
                          className="right-0 top-full mt-1.5"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. EMERGENCY CONTACT SECTION */}
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-visible">
          <button
            type="button"
            onClick={() => toggleSection("emergency")}
            className={`w-full flex justify-between items-center px-6 py-4.5 bg-zinc-50/50 hover:bg-zinc-50/80 transition-colors text-left rounded-t-2xl ${
              openSections.emergency ? "border-b border-zinc-100" : "rounded-b-2xl"
            }`}
          >
            <div className="flex items-center gap-3">
              <HeartHandshake className="h-4.5 w-4.5 text-[#0a2924]" />
              <span className="text-sm font-extrabold text-zinc-900 tracking-wide uppercase">
                2. Emergency Contact
              </span>
            </div>
            <ChevronDown
              className={`h-4.5 w-4.5 text-zinc-400 transition-transform duration-350 ease-out ${
                openSections.emergency ? "rotate-180" : ""
              }`}
            />
          </button>

          <div
            className={`accordion-grid ${openSections.emergency ? "accordion-grid-open" : ""}`}
          >
            <div className="accordion-grid-inner">
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                    Contact Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="emergency_contact_name"
                    required
                    placeholder="Enter Contact Name"
                    value={formData.emergency_contact_name}
                    onChange={handleChange}
                    className="w-full bg-white border border-zinc-200 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all shadow-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                    Relationship
                  </label>
                  <input
                    type="text"
                    name="emergency_contact_relationship"
                    placeholder="e.g. Father"
                    value={formData.emergency_contact_relationship}
                    onChange={handleChange}
                    className="w-full bg-white border border-zinc-200 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all shadow-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="emergency_contact_phone"
                    required
                    placeholder="Enter Phone Number"
                    value={formData.emergency_contact_phone}
                    onChange={handleChange}
                    className="w-full bg-white border border-zinc-200 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all shadow-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="emergency_contact_email"
                    placeholder="Enter Email Address"
                    value={formData.emergency_contact_email}
                    onChange={handleChange}
                    className="w-full bg-white border border-zinc-200 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all shadow-xs font-bold"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. PAYROLL AND COMPLIANCE SECTION */}
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-visible">
          <button
            type="button"
            onClick={() => toggleSection("payroll")}
            className={`w-full flex justify-between items-center px-6 py-4.5 bg-zinc-50/50 hover:bg-zinc-50/80 transition-colors text-left rounded-t-2xl ${
              openSections.payroll ? "border-b border-zinc-100" : "rounded-b-2xl"
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="h-4.5 w-4.5 text-[#0a2924]" />
              <span className="text-sm font-extrabold text-zinc-900 tracking-wide uppercase">
                3. Payroll and Compliance
              </span>
            </div>
            <ChevronDown
              className={`h-4.5 w-4.5 text-zinc-400 transition-transform duration-350 ease-out ${
                openSections.payroll ? "rotate-180" : ""
              }`}
            />
          </button>

          <div
            className={`accordion-grid ${openSections.payroll ? "accordion-grid-open" : ""}`}
          >
            <div className="accordion-grid-inner">
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Tax File Number with visibility toggle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                    Tax File Number
                  </label>
                  <div className="relative">
                    <input
                      type={showTFN ? "text" : "password"}
                      name="tax_file_number"
                      placeholder="e.g. 123456789"
                      value={formData.tax_file_number}
                      onChange={handleChange}
                      className="w-full bg-white border border-zinc-200 focus:border-[#0a2924] rounded-xl py-2.5 pl-3.5 pr-10 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all shadow-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTFN(!showTFN)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                    >
                      {showTFN ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                    Super Fund Name
                  </label>
                  <input
                    type="text"
                    name="super_fund_name"
                    placeholder="e.g. AustralianSuper"
                    value={formData.super_fund_name}
                    onChange={handleChange}
                    className="w-full bg-white border border-zinc-200 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all shadow-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                    Super Fund Member No.
                  </label>
                  <input
                    type="text"
                    name="super_fund_member_no"
                    placeholder="Super Member Number"
                    value={formData.super_fund_member_no}
                    onChange={handleChange}
                    className="w-full bg-white border border-zinc-200 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all shadow-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                    Bank Account Name
                  </label>
                  <input
                    type="text"
                    name="bank_account_name"
                    placeholder="Account Holder Name"
                    value={formData.bank_account_name}
                    onChange={handleChange}
                    className="w-full bg-white border border-zinc-200 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all shadow-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                    BSB
                  </label>
                  <input
                    type="text"
                    name="bank_bsb"
                    placeholder="e.g. 062-000"
                    value={formData.bank_bsb}
                    onChange={handleChange}
                    className="w-full bg-white border border-zinc-200 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all shadow-xs font-bold"
                  />
                </div>

                {/* Account Number with visibility toggle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                    Account Number
                  </label>
                  <div className="relative">
                    <input
                      type={showAccountNumber ? "text" : "password"}
                      name="bank_account_number"
                      placeholder="Account ID Number"
                      value={formData.bank_account_number}
                      onChange={handleChange}
                      className="w-full bg-white border border-zinc-200 focus:border-[#0a2924] rounded-xl py-2.5 pl-3.5 pr-10 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all shadow-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAccountNumber(!showAccountNumber)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                    >
                      {showAccountNumber ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                    Weekly Work Hours
                  </label>
                  <input
                    type="number"
                    name="weekly_work_hours"
                    placeholder="30"
                    min={0}
                    max={168}
                    value={formData.weekly_work_hours || ""}
                    onChange={handleChange}
                    className="w-full bg-white border border-zinc-200 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all shadow-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                    Residency Status
                  </label>
                  <input
                    type="text"
                    name="residency_status"
                    placeholder="e.g. Citizen, Visa"
                    value={formData.residency_status}
                    onChange={handleChange}
                    className="w-full bg-white border border-zinc-200 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all shadow-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                    Visa Expiry Date
                  </label>
                  <div ref={visaCalendarRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setShowVisaCalendar(!showVisaCalendar)}
                      className="w-full flex justify-between items-center bg-white border border-zinc-200 text-xs hover:bg-zinc-50/50 transition-colors focus:outline-none focus:ring-1 focus:ring-[#0a2924] focus:border-[#0a2924] cursor-pointer rounded-xl py-2.5 px-3.5 shadow-xs font-bold"
                    >
                      <span
                        className={
                          formData.visa_expiry_date
                            ? "text-zinc-950"
                            : "text-zinc-400"
                        }
                      >
                        {formData.visa_expiry_date || "Select date"}
                      </span>
                      <CalendarIcon className="h-4 w-4 text-zinc-400" />
                    </button>

                    {showVisaCalendar && (
                      <Calendar
                        selectedDate={formData.visa_expiry_date}
                        onChange={(dateStr) => {
                          setFormData((prev) => ({
                            ...prev,
                            visa_expiry_date: dateStr,
                          }));
                          setShowVisaCalendar(false);
                        }}
                        className="right-0 top-full mt-1.5"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. EMPLOYMENT INFORMATION SECTION (DISABLED/ADMIN MANAGED) */}
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-visible">
          <button
            type="button"
            onClick={() => toggleSection("employment")}
            className={`w-full flex justify-between items-center px-6 py-4.5 bg-zinc-50/50 hover:bg-zinc-50/80 transition-colors text-left rounded-t-2xl ${
              openSections.employment ? "border-b border-zinc-100" : "rounded-b-2xl"
            }`}
          >
            <div className="flex items-center gap-3">
              <Briefcase className="h-4.5 w-4.5 text-[#0a2924]" />
              <span className="text-sm font-extrabold text-zinc-900 tracking-wide uppercase">
                4. Employment Information
              </span>
            </div>
            <ChevronDown
              className={`h-4.5 w-4.5 text-zinc-400 transition-transform duration-350 ease-out ${
                openSections.employment ? "rotate-180" : ""
              }`}
            />
          </button>

          <div
            className={`accordion-grid ${openSections.employment ? "accordion-grid-open" : ""}`}
          >
            <div className="accordion-grid-inner">
              <div className="p-6 space-y-6">
                {/* Info alert banner */}
                <div className="flex items-start gap-3 bg-[#FEF3C7] border border-[#F59E0B]/30 rounded-xl p-4 text-[#92400E]">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold leading-normal">
                    Employment Information is managed by your administrator.
                    Contact support or HR to request changes.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-zinc-400 uppercase tracking-wide">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      disabled
                      value={formData.employee_id || "EMP-02145"}
                      className="w-full bg-zinc-100 border border-zinc-200 rounded-xl py-2.5 px-3.5 text-xs text-zinc-450 font-bold select-none cursor-not-allowed outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-zinc-400 uppercase tracking-wide">
                      Role
                    </label>
                    <input
                      type="text"
                      disabled
                      value={formData.role}
                      className="w-full bg-zinc-100 border border-zinc-200 rounded-xl py-2.5 px-3.5 text-xs text-zinc-450 font-bold select-none cursor-not-allowed outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-zinc-400 uppercase tracking-wide">
                      Position
                    </label>
                    <input
                      type="text"
                      disabled
                      value={formData.position || "Barista"}
                      className="w-full bg-zinc-100 border border-zinc-200 rounded-xl py-2.5 px-3.5 text-xs text-zinc-450 font-bold select-none cursor-not-allowed outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-zinc-400 uppercase tracking-wide">
                      Start Date
                    </label>
                    <input
                      type="text"
                      disabled
                      value={formData.start_date || "15/06/1990"}
                      className="w-full bg-zinc-100 border border-zinc-200 rounded-xl py-2.5 px-3.5 text-xs text-zinc-450 font-bold select-none cursor-not-allowed outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-extrabold text-zinc-400 uppercase tracking-wide">
                      Reports To
                    </label>
                    <input
                      type="text"
                      disabled
                      value={formData.reports_to}
                      className="w-full bg-zinc-100 border border-zinc-200 rounded-xl py-2.5 px-3.5 text-xs text-zinc-450 font-bold select-none cursor-not-allowed outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-extrabold text-zinc-400 uppercase tracking-wide">
                      Employment Type
                    </label>
                    <input
                      type="text"
                      disabled
                      value={formData.employment_type}
                      className="w-full bg-zinc-100 border border-zinc-200 rounded-xl py-2.5 px-3.5 text-xs text-zinc-450 font-bold select-none cursor-not-allowed outline-none"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2 lg:col-span-4">
                    <label className="text-xs font-extrabold text-zinc-400 uppercase tracking-wide block">
                      Assigned Locations
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {assignedLocations.length > 0 ? (
                        assignedLocations.map((loc) => (
                          <span
                            key={loc.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-extrabold bg-zinc-100 text-zinc-700 border border-zinc-200 select-none cursor-not-allowed"
                          >
                            <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                            {loc.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-zinc-450 font-bold italic">
                          No locations assigned
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Action Buttons Bar */}
        <div className="border-t border-zinc-200 pt-6 flex items-center justify-end gap-3.5">
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer shadow-3xs disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="bg-[#0a2924] hover:bg-[#09231f] disabled:bg-[#0a2924]/60 text-white px-7 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 transition-all duration-150 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                Saving...
              </>
            ) : (
              "Save Profile"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
