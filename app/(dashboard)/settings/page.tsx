"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User, Store, DollarSign, Shield, LogOut, Trash2, CheckCircle2,
  AlertTriangle, Save, RefreshCw, KeyRound, Bell, Phone,
  Clock, ShieldAlert, BadgeCheck, FileCheck2, ImagePlus
} from "lucide-react";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { getSettings, updateStationSettings, updateUserProfile } from "@/app/actions/settings";
import { logout, updateUserPassword } from "@/app/actions/auth";
import CarouselManager from "@/features/settings/CarouselManager";

type TabId = "account" | "station" | "pricing" | "carousel" | "security";

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("account");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ─── STATE FIELDS ───
  // Account settings state
  const [accountInfo, setAccountInfo] = useState({
    name: "",
    email: "",
    phone: "",
    role: "Station Manager",
    smsSummary: true,
    emailAlerts: true
  });

  // Station settings state
  const [stationInfo, setStationInfo] = useState({
    name: "",
    hotline: "",
    address: "",
    hours: "",
    license: ""
  });

  // Pricing rates settings state
  const [ratesInfo, setRatesInfo] = useState({
    alkalineRound: "50.00",
    alkalineFlat: "45.00",
    mineralRound: "40.00",
    mineralFlat: "35.00"
  });

  // Security settings state
  const [passwordInfo, setPasswordInfo] = useState({
    current: "",
    new: "",
    confirm: ""
  });

  // Destructive Actions Modals
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [simulatedActionMessage, setSimulatedActionMessage] = useState<string | null>(null);

  // Load Settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const data = await getSettings();
        
        setAccountInfo({
          name: data.profile.name,
          email: data.auth.email,
          phone: data.profile.phone,
          role: data.auth.role,
          smsSummary: data.profile.sms_summary,
          emailAlerts: data.profile.email_alerts,
        });

        setStationInfo({
          name: data.stationSettings.name,
          hotline: data.stationSettings.hotline,
          address: data.stationSettings.address,
          hours: data.stationSettings.hours,
          license: data.stationSettings.license,
        });

        setRatesInfo({
          alkalineRound: data.stationSettings.alkaline_round,
          alkalineFlat: data.stationSettings.alkaline_flat,
          mineralRound: data.stationSettings.mineral_round,
          mineralFlat: data.stationSettings.mineral_flat,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load settings from server.";
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Save Account Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);

    try {
      const result = await updateUserProfile({
        name: accountInfo.name,
        phone: accountInfo.phone || null,
        sms_summary: accountInfo.smsSummary,
        email_alerts: accountInfo.emailAlerts,
        email: accountInfo.email,
      });

      if (result.success) {
        setSaveSuccess("Account Profile settings updated successfully!");
        setTimeout(() => setSaveSuccess(null), 4000);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update profile settings.";
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Save Station Configuration
  const handleSaveStationConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);

    try {
      const result = await updateStationSettings({
        name: stationInfo.name,
        hotline: stationInfo.hotline,
        address: stationInfo.address,
        hours: stationInfo.hours,
        license: stationInfo.license,
        alkaline_round: Number(ratesInfo.alkalineRound),
        alkaline_flat: Number(ratesInfo.alkalineFlat),
        mineral_round: Number(ratesInfo.mineralRound),
        mineral_flat: Number(ratesInfo.mineralFlat),
      });

      if (result.success) {
        setSaveSuccess("Station Configuration settings updated successfully!");
        setTimeout(() => setSaveSuccess(null), 4000);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update station configuration.";
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Save Pricing Rates
  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);

    try {
      const result = await updateStationSettings({
        name: stationInfo.name,
        hotline: stationInfo.hotline,
        address: stationInfo.address,
        hours: stationInfo.hours,
        license: stationInfo.license,
        alkaline_round: Number(ratesInfo.alkalineRound),
        alkaline_flat: Number(ratesInfo.alkalineFlat),
        mineral_round: Number(ratesInfo.mineralRound),
        mineral_flat: Number(ratesInfo.mineralFlat),
      });

      if (result.success) {
        setSaveSuccess("Product Pricing settings updated successfully!");
        setTimeout(() => setSaveSuccess(null), 4000);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update pricing rates.";
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger password update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInfo.current || !passwordInfo.new || !passwordInfo.confirm) {
      alert("Please fill in all password fields.");
      return;
    }
    if (passwordInfo.new !== passwordInfo.confirm) {
      alert("New password and confirm password do not match.");
      return;
    }

    setIsSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);

    try {
      const result = await updateUserPassword(passwordInfo.new);
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        setSaveSuccess("Security credentials updated successfully. Please log back in.");
        setPasswordInfo({ current: "", new: "", confirm: "" });
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update password.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Logout confirm handler
  const handleLogoutConfirm = async () => {
    setShowLogoutModal(false);
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const result = await logout();
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        router.push("/login");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign out of session.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Simulated Account Deletion
  const handleDeleteConfirm = () => {
    setShowDeleteModal(false);
    setSimulatedActionMessage("Account deletion initiated. All station databases cleared... (Simulated)");
    setTimeout(() => setSimulatedActionMessage(null), 4000);
  };

  // Sidebar navigation options
  const tabsList = [
    { id: "account" as TabId, label: "Account Profile", icon: User, description: "Personal details & alerts" },
    { id: "station" as TabId, label: "Station Config", icon: Store, description: "Brand name, address & permit" },
    { id: "pricing" as TabId, label: "Product Pricing", icon: DollarSign, description: "Water rates per container" },
    { id: "carousel" as TabId, label: "Login Carousel", icon: ImagePlus, description: "Manage login page images" },
    { id: "security" as TabId, label: "Security & Session", icon: Shield, description: "Danger zone & session tools" }
  ];

  if (isLoading) {
    return (
      <PageContainer title="Settings">
        <div className="flex flex-col items-center justify-center min-h-[450px]">
          <RefreshCw className="w-8 h-8 text-[#2FA9D9] animate-spin" />
          <p className="text-sm text-gray-500 mt-4">Loading configuration...</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Settings">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* ─── ACTION BANNER ─── */}
        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-start gap-3 transition-all duration-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Success</p>
              <p className="text-xs text-emerald-700/90 mt-0.5">{saveSuccess}</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-start gap-3 transition-all duration-300">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Error</p>
              <p className="text-xs text-rose-700/90 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {simulatedActionMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-start gap-3 transition-all duration-300">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Alert Simulation</p>
              <p className="text-xs text-rose-700/90 mt-0.5">{simulatedActionMessage}</p>
            </div>
          </div>
        )}

        {/* ─── DUAL COLUMN SETTINGS PANEL ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* LEFT: Tab Navigation Buttons */}
          <div className="lg:col-span-1 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-2 border-b lg:border-b-0 lg:border-r border-gray-100 pb-3 lg:pb-0 lg:pr-6 shrink-0 scrollbar-none">
            {tabsList.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSaveSuccess(null);
                    setErrorMessage(null);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors whitespace-nowrap lg:whitespace-normal w-auto lg:w-full shrink-0 cursor-pointer outline-none ${
                    isActive
                      ? "bg-sky-50 text-[#2FA9D9] font-bold border border-sky-100"
                      : "text-gray-600 hover:bg-gray-50/50 hover:text-gray-900 border border-transparent"
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-[#2FA9D9]" : "text-gray-400"}`} />
                  <div className="hidden sm:block text-left">
                    <p className="text-sm leading-snug">{tab.label}</p>
                    <p className={`text-[10px] mt-0.5 font-normal ${isActive ? "text-[#2FA9D9]/80" : "text-gray-400"}`}>
                      {tab.description}
                    </p>
                  </div>
                  <span className="sm:hidden text-xs">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* RIGHT: Active Tab Form Pane */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 p-6 min-h-[450px]">
            
            {/* ─── T1: ACCOUNT PROFILE TAB ─── */}
            {activeTab === "account" && (
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <User className="w-5 h-5 text-[#2FA9D9]" />
                    Account Profile
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Update your identity credentials and summary digest preferences.
                  </p>
                </div>
                <Separator className="bg-gray-100" />

                {/* Avatar Uploader Placeholder */}
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50/40 p-4 rounded-xl border border-gray-100">
                  <div className="w-16 h-16 rounded-full bg-[#2FA9D9]/10 border border-[#2FA9D9]/20 flex items-center justify-center text-[#2FA9D9] text-xl font-bold font-mono">
                    {accountInfo.name ? accountInfo.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase() : "JD"}
                  </div>
                  <div className="text-center sm:text-left space-y-1">
                    <p className="text-sm font-semibold text-gray-800">Profile Photo</p>
                    <p className="text-[11px] text-gray-400">JPG, PNG or WEBP. Max 2MB.</p>
                    <div className="flex gap-2 mt-1 justify-center sm:justify-start">
                      <Button type="button" variant="outline" size="xs" className="text-xs text-gray-600">
                        Upload
                      </Button>
                      <Button type="button" variant="ghost" size="xs" className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50/30">
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="account_name" className="text-xs font-semibold text-gray-700">Full Name</Label>
                    <Input
                      id="account_name"
                      required
                      value={accountInfo.name}
                      onChange={(e) => setAccountInfo((p) => ({ ...p, name: e.target.value }))}
                      disabled={isSaving}
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="account_email" className="text-xs font-semibold text-gray-700">Email Address</Label>
                    <Input
                      id="account_email"
                      type="email"
                      required
                      value={accountInfo.email}
                      onChange={(e) => setAccountInfo((p) => ({ ...p, email: e.target.value }))}
                      disabled={isSaving}
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="account_phone" className="text-xs font-semibold text-gray-700">Contact Number</Label>
                    <Input
                      id="account_phone"
                      type="tel"
                      required
                      value={accountInfo.phone}
                      onChange={(e) => setAccountInfo((p) => ({ ...p, phone: e.target.value }))}
                      disabled={isSaving}
                    />
                  </div>

                  {/* Role (Read Only) */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-700">Role / Credentials</Label>
                    <div className="h-9 px-3 border border-gray-200 rounded-md bg-gray-50 flex items-center justify-between">
                      <span className="text-sm text-gray-700 font-medium">{accountInfo.role}</span>
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                        <BadgeCheck className="w-3 h-3 text-emerald-600" /> Active Admin
                      </span>
                    </div>
                  </div>
                </div>

                <Separator className="bg-gray-100" />

                {/* Notifications & Digest Setup */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5" /> Notification Prefs
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={accountInfo.smsSummary}
                        onChange={(e) => setAccountInfo((p) => ({ ...p, smsSummary: e.target.checked }))}
                        className="mt-1 rounded border-gray-300 text-[#2FA9D9] focus:ring-[#2FA9D9]"
                        disabled={isSaving}
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-800 group-hover:text-gray-900">SMS Daily Ledger Report</span>
                        <span className="block text-[11px] text-gray-400">Receive summary statistics of daily water log meter calculations.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={accountInfo.emailAlerts}
                        onChange={(e) => setAccountInfo((p) => ({ ...p, emailAlerts: e.target.checked }))}
                        className="mt-1 rounded border-gray-300 text-[#2FA9D9] focus:ring-[#2FA9D9]"
                        disabled={isSaving}
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-800 group-hover:text-gray-900">High Variance Email Alerts</span>
                        <span className="block text-[11px] text-gray-400">Alert me if variance between log meters and transactional sales exceeds 5%.</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="bg-[#2FA9D9] hover:bg-[#2195c0] text-white transition-all w-full sm:w-auto"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Saving Profile...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Profile Details
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* ─── T2: WATER STATION CONFIG TAB ─── */}
            {activeTab === "station" && (
              <form onSubmit={handleSaveStationConfig} className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Store className="w-5 h-5 text-[#2FA9D9]" />
                    Station Configuration
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Configure business hours, hotlines, and permit numbers for invoices and logs.
                  </p>
                </div>
                <Separator className="bg-gray-100" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Station Name */}
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="station_name" className="text-xs font-semibold text-gray-700">Water Station Name</Label>
                    <Input
                      id="station_name"
                      required
                      value={stationInfo.name}
                      onChange={(e) => setStationInfo((p) => ({ ...p, name: e.target.value }))}
                      disabled={isSaving}
                    />
                  </div>

                  {/* Address */}
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="station_address" className="text-xs font-semibold text-gray-700">Physical Address</Label>
                    <Input
                      id="station_address"
                      required
                      value={stationInfo.address}
                      onChange={(e) => setStationInfo((p) => ({ ...p, address: e.target.value }))}
                      disabled={isSaving}
                    />
                  </div>

                  {/* Hotline */}
                  <div className="space-y-2">
                    <Label htmlFor="station_hotline" className="text-xs font-semibold text-gray-700">Delivery Hotline</Label>
                    <div className="relative">
                      <Input
                        id="station_hotline"
                        required
                        value={stationInfo.hotline}
                        onChange={(e) => setStationInfo((p) => ({ ...p, hotline: e.target.value }))}
                        className="pl-9"
                        disabled={isSaving}
                      />
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>

                  {/* Operating Hours */}
                  <div className="space-y-2">
                    <Label htmlFor="station_hours" className="text-xs font-semibold text-gray-700">Operating Hours</Label>
                    <div className="relative">
                      <Input
                        id="station_hours"
                        required
                        value={stationInfo.hours}
                        onChange={(e) => setStationInfo((p) => ({ ...p, hours: e.target.value }))}
                        className="pl-9"
                        disabled={isSaving}
                      />
                      <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>

                  {/* License / Permit ID */}
                  <div className="space-y-2">
                    <Label htmlFor="station_license" className="text-xs font-semibold text-gray-700">Sanitary Permit / License ID</Label>
                    <div className="relative">
                      <Input
                        id="station_license"
                        value={stationInfo.license}
                        onChange={(e) => setStationInfo((p) => ({ ...p, license: e.target.value }))}
                        className="pl-9"
                        disabled={isSaving}
                      />
                      <FileCheck2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="bg-[#2FA9D9] hover:bg-[#2195c0] text-white w-full sm:w-auto"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Saving Config...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Station Configuration
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* ─── T3: PRODUCT PRICING TAB ─── */}
            {activeTab === "pricing" && (
              <form onSubmit={handleSavePricing} className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[#2FA9D9]" />
                    Product Pricing Rates
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Set baseline refill rates for water types and container shapes. Changes dynamically apply to POS calculations.
                  </p>
                </div>
                <Separator className="bg-gray-100" />

                {/* Alkaline Water Pricing */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-sky-700">
                    <div className="w-1.5 h-3 bg-sky-400 rounded-sm" />
                    Alkaline Water Rates
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="alkaline_round" className="text-xs font-semibold text-gray-700">Round Container Rate (₱)</Label>
                      <div className="relative">
                        <Input
                          id="alkaline_round"
                          type="number"
                          step="0.01"
                          required
                          value={ratesInfo.alkalineRound}
                          onChange={(e) => setRatesInfo((p) => ({ ...p, alkalineRound: e.target.value }))}
                          className="pl-8"
                          disabled={isSaving}
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="alkaline_flat" className="text-xs font-semibold text-gray-700">Slim / Flat Container Rate (₱)</Label>
                      <div className="relative">
                        <Input
                          id="alkaline_flat"
                          type="number"
                          step="0.01"
                          required
                          value={ratesInfo.alkalineFlat}
                          onChange={(e) => setRatesInfo((p) => ({ ...p, alkalineFlat: e.target.value }))}
                          className="pl-8"
                          disabled={isSaving}
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="bg-gray-100/60" />

                {/* Mineral Water Pricing */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                    <div className="w-1.5 h-3 bg-emerald-400 rounded-sm" />
                    Mineral Water Rates
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mineral_round" className="text-xs font-semibold text-gray-700">Round Container Rate (₱)</Label>
                      <div className="relative">
                        <Input
                          id="mineral_round"
                          type="number"
                          step="0.01"
                          required
                          value={ratesInfo.mineralRound}
                          onChange={(e) => setRatesInfo((p) => ({ ...p, mineralRound: e.target.value }))}
                          className="pl-8"
                          disabled={isSaving}
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mineral_flat" className="text-xs font-semibold text-gray-700">Slim / Flat Container Rate (₱)</Label>
                      <div className="relative">
                        <Input
                          id="mineral_flat"
                          type="number"
                          step="0.01"
                          required
                          value={ratesInfo.mineralFlat}
                          onChange={(e) => setRatesInfo((p) => ({ ...p, mineralFlat: e.target.value }))}
                          className="pl-8"
                          disabled={isSaving}
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Settings Banner */}
                <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-3 flex gap-2.5 text-xs text-sky-800">
                  <KeyRound className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                  <p>
                    <strong>Automatic Calculation Info:</strong> Editing pricing parameters here automatically recalibrates default billing totals for checkout forms in the orders interface.
                  </p>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="bg-[#2FA9D9] hover:bg-[#2195c0] text-white w-full sm:w-auto"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Saving Rates...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Pricing Rates
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* ─── T4: LOGIN CAROUSEL TAB ─── */}
            {activeTab === "carousel" && (
              <CarouselManager />
            )}

            {/* ─── T5: SECURITY & SESSION TAB ─── */}
            {activeTab === "security" && (
              <div className="space-y-6">
                {/* Header */}
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#2FA9D9]" />
                    Security & Session Tools
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Manage administrative password updates, log out of current hardware, or wipe databases.
                  </p>
                </div>
                <Separator className="bg-gray-100" />

                {/* Change Password Panel */}
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" /> Update Administrative Password
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="curr_pass" className="text-xs font-semibold text-gray-700">Current Password</Label>
                      <Input
                        id="curr_pass"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={passwordInfo.current}
                        onChange={(e) => setPasswordInfo((p) => ({ ...p, current: e.target.value }))}
                        disabled={isSaving}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new_pass" className="text-xs font-semibold text-gray-700">New Password</Label>
                      <Input
                        id="new_pass"
                        type="password"
                        required
                        placeholder="Min. 8 characters"
                        value={passwordInfo.new}
                        onChange={(e) => setPasswordInfo((p) => ({ ...p, new: e.target.value }))}
                        disabled={isSaving}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm_pass" className="text-xs font-semibold text-gray-700">Confirm Password</Label>
                      <Input
                        id="confirm_pass"
                        type="password"
                        required
                        placeholder="Confirm password"
                        value={passwordInfo.confirm}
                        onChange={(e) => setPasswordInfo((p) => ({ ...p, confirm: e.target.value }))}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" variant="outline" className="border-gray-200 hover:text-[#2FA9D9] w-full sm:w-auto" disabled={isSaving}>
                      Update Password
                    </Button>
                  </div>
                </form>

                <Separator className="bg-gray-100" />

                {/* Danger Zone */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Danger Zone
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Logout Block */}
                    <div className="border border-gray-100 rounded-xl p-4 flex flex-col justify-between h-40">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                          <LogOut className="w-4 h-4 text-gray-500" /> Sign Out
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">
                          Sign out of the administration console on this computer. You will need credentials to log back in.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowLogoutModal(true)}
                        className="w-full text-rose-600 hover:text-rose-700 border-gray-200 hover:bg-rose-50/20"
                        disabled={isSaving}
                      >
                        Log Out Session
                      </Button>
                    </div>

                    {/* Delete Account Block */}
                    <div className="border border-rose-100 bg-rose-50/20 rounded-xl p-4 flex flex-col justify-between h-40">
                      <div>
                        <h4 className="text-sm font-bold text-rose-700 flex items-center gap-1.5">
                          <Trash2 className="w-4 h-4 text-rose-600" /> Delete Account & Data
                        </h4>
                        <p className="text-xs text-rose-600/80 mt-1">
                          Permanently delete your profile and wipe water station datasets. This action is terminal and cannot be undone.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setShowDeleteModal(true)}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white border-none"
                        disabled={isSaving}
                      >
                        Delete Station Account
                      </Button>
                    </div>

                  </div>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

      {/* ─── MODAL DIALOGS ─── */}
      {/* 1. Logout Confirm Dialog */}
      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <LogOut className="w-5 h-5 text-rose-500" /> Confirm Session Logout
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to end your administration session? Active POS entries or log draft reports might be discarded.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowLogoutModal(false)}
              className="w-full sm:w-auto"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLogoutConfirm}
              className="bg-rose-600 hover:bg-rose-700 text-white w-full sm:w-auto"
              disabled={isSaving}
            >
              {isSaving ? "Signing Out..." : "Yes, Log Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Wipe / Delete Confirm Dialog */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" /> Irreversible Account Deletion
            </DialogTitle>
            <DialogDescription className="space-y-2 text-xs">
              <p>
                <strong>Warning:</strong> You are about to initiate deletion of your water station configuration.
              </p>
              <p>
                This action wipes the station profile, historical water log files, orders data, customer accounts, and settings maps. It is impossible to recover this information.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="w-full sm:w-auto"
            >
              Cancel, Keep Active
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="bg-rose-600 hover:bg-rose-700 text-white w-full sm:w-auto"
            >
              Yes, Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
