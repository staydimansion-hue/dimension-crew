"use client";

import StaffGate from "@/components/StaffGate";
import RoomsChecklist from "@/components/RoomsChecklist";

export default function RoomsPage() {
  return (
    <StaffGate cardClassName="w-full max-w-md" activeTab="rooms">
      {(name) => <RoomsChecklist name={name} />}
    </StaffGate>
  );
}
