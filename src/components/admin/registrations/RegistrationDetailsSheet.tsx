"use client"

import React from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import {
  User,
  Building2,
  Mail,
  Phone,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Download,
  ExternalLink,
  ChevronDown,
  Globe,
  Hash,
  MessageSquare,
  Tag,
  Shield,
  Smartphone,
  Clock,
  FileCheck,
} from "lucide-react"
import { format } from "date-fns"
import type { Registration } from "@/lib/types/admin"
import { PhoneNumberDisplay } from "@/components/admin/shared/PhoneNumberDisplay"

interface RegistrationDetailsSheetProps {
  registration: Registration | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApprove?: (registration: Registration) => void
  onReject?: (registration: Registration) => void
}

// Status configuration for badge colors
const statusConfig = {
  pending: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    icon: XCircle,
  },
} as const

// Verification badge component
const VerificationBadge: React.FC<{
  verified: boolean
  label: string
  icon: React.ElementType
}> = ({ verified, label, icon: Icon }) => (
  <div className="flex items-center gap-2">
    <Icon className={cn("h-4 w-4", verified ? "text-green-600" : "text-gray-400")} />
    <span className={cn("text-sm", verified ? "text-green-600 font-medium" : "text-gray-500")}>
      {label}
    </span>
    <Badge variant={verified ? "default" : "secondary"} className={cn("ml-auto", verified ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "")}>
      {verified ? "Verified" : "Not Verified"}
    </Badge>
  </div>
)

// Section heading component
const SectionHeading: React.FC<{
  icon: React.ElementType
  title: string
}> = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 mb-4">
    <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
    <h3 className="font-semibold text-base">{title}</h3>
  </div>
)

// Information row component
const InfoRow: React.FC<{
  label: string
  value: string | React.ReactNode
  icon?: React.ElementType
  href?: string
}> = ({ label, value, icon: Icon, href }) => (
  <div className="flex flex-col sm:flex-row sm:justify-between py-2 gap-1 sm:gap-4">
    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1.5">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}:
    </span>
    {href ? (
      <a
        href={href}
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 break-all"
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      >
        {value}
        {href.startsWith("http") && <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />}
      </a>
    ) : (
      <span className="text-sm text-gray-900 dark:text-gray-100 break-all">{value}</span>
    )}
  </div>
)

export function RegistrationDetailsSheet({
  registration,
  open,
  onOpenChange,
  onApprove,
  onReject,
}: RegistrationDetailsSheetProps) {
  const [documentsOpen, setDocumentsOpen] = React.useState(false)

  if (!registration) return null

  const StatusIcon = statusConfig[registration.status]?.icon || Clock
  const statusColors = statusConfig[registration.status]?.color || ""
  const statusLabel = statusConfig[registration.status]?.label || registration.status

  const handleExport = () => {
    // Create a text representation of the registration data
    const exportData = {
      id: registration._id,
      name: `${registration.name} ${registration.surname}`,
      email: registration.email,
      phone: registration.phone,
      mobile: registration.mobile,
      companyName: registration.companyName,
      companyWebsite: registration.companyWebsite,
      registrationType: registration.registrationType,
      status: registration.status,
      ageVerified: registration.ageVerified,
      emailVerified: registration.emailVerified,
      mobileVerified: registration.mobileVerified,
      source: registration.source,
      submittedAt: registration.submittedAt,
      notes: registration.notes,
      tags: registration.tags,
    }

    const jsonString = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonString], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `registration-${registration._id}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px] flex flex-col h-full p-0">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-2">
                <SheetTitle className="text-xl">Registration Details</SheetTitle>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="outline" className="font-mono">
                    <Hash className="h-3 w-3 mr-1" />
                    {registration._id.slice(-8).toUpperCase()}
                  </Badge>
                  <Badge className={cn("gap-1", statusColors)}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {statusLabel}
                  </Badge>
                </div>
              </div>
            </div>
            <SheetDescription className="flex items-center gap-1 text-sm">
              <Calendar className="h-3.5 w-3.5" />
              Submitted on {format(new Date(registration.submittedAt || registration.createdAt), "PPP 'at' p")}
            </SheetDescription>
          </div>
        </SheetHeader>

        {/* Content */}
        <ScrollArea className="flex-1 px-6 py-6">
          <div className="space-y-6">
            {/* Applicant Information */}
            <section>
              <SectionHeading icon={User} title="Applicant Information" />
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-1">
                    <InfoRow
                      label="Full Name"
                      value={`${registration.name} ${registration.surname}`}
                    />
                    <InfoRow
                      label="Email"
                      value={registration.email}
                      icon={Mail}
                      href={`mailto:${registration.email}`}
                    />
                    <div className="flex flex-col sm:flex-row sm:justify-between py-2 gap-1 sm:gap-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        Phone:
                      </span>
                      <PhoneNumberDisplay phone={registration.phone} className="justify-end" />
                    </div>
                    {registration.mobile && (
                      <div className="flex flex-col sm:flex-row sm:justify-between py-2 gap-1 sm:gap-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1.5">
                          <Smartphone className="h-3.5 w-3.5" />
                          Mobile:
                        </span>
                        <PhoneNumberDisplay phone={registration.mobile} className="justify-end" />
                      </div>
                    )}
                    <Separator className="my-2" />
                    <InfoRow
                      label="Age Verified"
                      value={
                        <Badge
                          variant={registration.ageVerified ? "default" : "secondary"}
                          className={cn(
                            registration.ageVerified
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : ""
                          )}
                        >
                          {registration.ageVerified ? "21+ Verified" : "Not Verified"}
                        </Badge>
                      }
                      icon={Shield}
                    />
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Company Details */}
            <section>
              <SectionHeading icon={Building2} title="Company Details" />
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-1">
                    <InfoRow label="Company Name" value={registration.companyName || "Not Provided"} />
                    {registration.companyWebsite && (
                      <InfoRow
                        label="Website"
                        value={registration.companyWebsite}
                        icon={Globe}
                        href={
                          registration.companyWebsite.startsWith("http")
                            ? registration.companyWebsite
                            : `https://${registration.companyWebsite}`
                        }
                      />
                    )}
                    <InfoRow
                      label="Registration Type"
                      value={
                        <Badge variant="outline" className="capitalize">
                          {registration.registrationType}
                        </Badge>
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Verification Status */}
            <section>
              <SectionHeading icon={Shield} title="Verification Status" />
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <VerificationBadge
                    verified={registration.emailVerified}
                    label="Email Address"
                    icon={Mail}
                  />
                  <VerificationBadge
                    verified={registration.mobileVerified}
                    label="Mobile Number"
                    icon={Smartphone}
                  />
                  <VerificationBadge
                    verified={registration.ageVerified}
                    label="Age (21+)"
                    icon={Shield}
                  />
                </CardContent>
              </Card>
            </section>

            {/* Additional Information */}
            <section>
              <SectionHeading icon={FileText} title="Additional Information" />
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <InfoRow label="Source" value={registration.source || "Direct"} />
                    {registration.tags && registration.tags.length > 0 && (
                      <div className="py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1.5 mb-2">
                          <Tag className="h-3.5 w-3.5" />
                          Tags:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {registration.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {registration.notes && (
                      <div className="py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1.5 mb-2">
                          <MessageSquare className="h-3.5 w-3.5" />
                          Notes:
                        </span>
                        <Card className="bg-gray-50 dark:bg-gray-900/50">
                          <CardContent className="pt-3 pb-3">
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {registration.notes}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Documents Section */}
            {registration.documents && registration.documents.length > 0 && (
              <section>
                <Collapsible open={documentsOpen} onOpenChange={setDocumentsOpen}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900/70 transition-colors">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        <h3 className="font-semibold text-base">
                          Documents ({registration.documents.length})
                        </h3>
                      </div>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          documentsOpen && "rotate-180"
                        )}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Card className="mt-2">
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          {registration.documents.map((doc, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-900/50 rounded-md"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-gray-500" />
                                <span className="text-sm">{doc.name || `Document ${index + 1}`}</span>
                              </div>
                              <Button size="sm" variant="ghost" className="h-7 px-2">
                                <Download className="h-3.5 w-3.5 mr-1" />
                                Download
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              </section>
            )}

            {/* Custom Fields */}
            {registration.customFields && Object.keys(registration.customFields).length > 0 && (
              <section>
                <SectionHeading icon={FileText} title="Custom Fields" />
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-1">
                      {Object.entries(registration.customFields).map(([key, value]) => (
                        <InfoRow
                          key={key}
                          label={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")}
                          value={String(value)}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <SheetFooter className="px-6 py-4 border-t bg-gray-50/50 dark:bg-gray-900/20">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            {registration.status === "pending" && (onApprove || onReject) && (
              <div className="flex gap-2 flex-1">
                {onApprove && (
                  <Button
                    onClick={() => onApprove(registration)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                )}
                {onReject && (
                  <Button
                    onClick={() => onReject(registration)}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleExport} variant="outline" size="default">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => onOpenChange(false)} variant="ghost">
                Close
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}