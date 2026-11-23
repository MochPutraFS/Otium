"use client";

import RoutingSlipCard from "@/components/ui/RoutingSlipCard";

/**
 * Wrapper kompatibel untuk kartu verifikasi Ketua Divisi (`mode="leader"`) & HRD (`mode="hrd"`).
 * Mendelegasikan rendering ke komponen Swiss Archival `RoutingSlipCard` (Umlaufzettel).
 */
export default function VerificationCard({
  request,
  mode = "leader",
  isSelected = false,
  onToggleSelect,
  onOpenDetail,
  onOpenApprove,
  onOpenReject,
}) {
  return (
    <RoutingSlipCard
      request={request}
      mode={mode}
      isSelected={isSelected}
      showActions
      onToggleSelect={onToggleSelect}
      onOpenDetail={onOpenDetail}
      onOpenApprove={onOpenApprove}
      onOpenReject={onOpenReject}
    />
  );
}
