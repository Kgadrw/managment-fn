import { useState, useMemo } from "react";
import { useStore } from "@/store/useStore";
import { useSearchParams } from "react-router-dom";
import { FilterBar } from "@/components/shared/FilterBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { formatDate, formatRelativeDate, isOverdue } from "@/utils/date";
import { formatMoney } from "@/utils/currency";
import { AmountInput } from "@/components/shared/AmountInput";
import { useCurrencyDisplay } from "@/hooks/useCurrencyDisplay";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, ArrowUpDown, Building2 } from "lucide-react";
import type { RentRecord, RecordStatus } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileFormSteps } from "@/components/shared/MobileFormSteps";
import { cn } from "@/lib/utils";
import { CreatableSelect } from "@/components/shared/CreatableSelect";
import { PROPERTY_TYPE_PRESETS } from "@/constants/fieldPresets";
import { mergeOptions } from "@/utils/creatableOptions";

const defaultRent: Omit<RentRecord, "id" | "createdAt"> = {
  title: "", propertyType: "", contactName: "", payerName: "", payerEmail: "", rentAmount: 0, paymentFrequency: "monthly",
  dueDate: "", contractStartDate: "", contractEndDate: "", status: "active", notes: "",
};

const statusOpts = [
  { value: "active", label: "Active" },
  { value: "overdue", label: "Overdue" },
  { value: "completed", label: "Completed" },
  { value: "inactive", label: "Inactive" },
];
const sortOpts: { value: keyof RentRecord; label: string }[] = [
  { value: "title", label: "Title" },
  { value: "propertyType", label: "Type" },
  { value: "contactName", label: "Contact" },
  { value: "rentAmount", label: "Amount" },
  { value: "dueDate", label: "Due Date" },
  { value: "status", label: "Status" },
];

export default function RentPage() {
  useCurrencyDisplay();
  const { rentRecords, addRentRecord, updateRentRecord, deleteRentRecord, isLoading, error } = useStore();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<keyof RentRecord>("dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [formOpen, setFormOpen] = useState(searchParams.get("new") === "true");
  const [editing, setEditing] = useState<RentRecord | null>(null);
  const [formData, setFormData] = useState(defaultRent);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const propertyTypeOptions = useMemo(
    () => mergeOptions(PROPERTY_TYPE_PRESETS, rentRecords.map((r) => r.propertyType)),
    [rentRecords],
  );

  const filtered = useMemo(() => {
    let data = [...rentRecords];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((r) => r.title.toLowerCase().includes(q) || r.contactName.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") data = data.filter((r) => r.status === statusFilter);
    data.sort((a, b) => {
      const av = a[sortField], bv = b[sortField];
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return data;
  }, [rentRecords, search, statusFilter, sortField, sortDir]);

  const toggleSort = (field: keyof RentRecord) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const openCreate = () => { setEditing(null); setFormData(defaultRent); setFormOpen(true); };
  const openEdit = (r: RentRecord) => { setEditing(r); setFormData(r); setFormOpen(true); };
  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) await updateRentRecord(editing.id, formData);
      else await addRentRecord(formData);
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteRentRecord(deleteId);
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const SortHeader = ({ field, children }: { field: keyof RentRecord; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(field)}>
      <span className="flex items-center gap-1">{children}<ArrowUpDown className="h-3 w-3 text-muted-foreground" /></span>
    </TableHead>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rent Records</h1>
          <p className="text-sm text-muted-foreground">{rentRecords.length} total records</p>
          {isLoading && <p className="text-xs text-muted-foreground mt-1">Loading…</p>}
          {!isLoading && error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
        <Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" />Add Rent Record</Button>
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search rent records..." statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} statusOptions={statusOpts}>
        <Select value={sortField} onValueChange={(v) => setSortField(v as keyof RentRecord)}>
          <SelectTrigger className="w-[170px] rounded-full">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {sortOpts.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortDir} onValueChange={(v) => setSortDir(v as "asc" | "desc")}>
          <SelectTrigger className="w-[140px] rounded-full">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Ascending</SelectItem>
            <SelectItem value="desc">Descending</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState title="No rent records found" icon={<Building2 className="h-8 w-8 text-muted-foreground" />} action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Rent Record</Button>} />
      ) : (
        <div className="rounded-3xl border bg-white overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader field="title">Title</SortHeader>
                <SortHeader field="propertyType">Type</SortHeader>
                <SortHeader field="contactName">Contact</SortHeader>
                <SortHeader field="rentAmount">Amount</SortHeader>
                <SortHeader field="dueDate">Due Date</SortHeader>
                <SortHeader field="status">Status</SortHeader>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>{r.propertyType}</TableCell>
                  <TableCell>{r.contactName}</TableCell>
                  <TableCell>{formatMoney(r.rentAmount)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{formatDate(r.dueDate)}</span>
                      {isOverdue(r.dueDate) && r.status !== "completed" && <span className="text-xs text-destructive">{formatRelativeDate(r.dueDate)}</span>}
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1 opacity-100">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Edit Rent Record" : "New Rent Record"}</DialogTitle></DialogHeader>
          {isMobile ? (
            <MobileFormSteps
              primaryLabel={editing ? "Save Changes" : "Add Rent Record"}
              onPrimary={() => void handleSave()}
              primaryDisabled={saving}
              isLoading={saving}
              onClose={() => setFormOpen(false)}
              steps={[
                {
                  key: "property",
                  title: "Property",
                  canContinue: () => !!formData.title.trim(),
                  content: (
                    <>
                      <div className="grid gap-2">
                        <Label>Title</Label>
                        <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Property Type</Label>
                        <CreatableSelect
                          value={formData.propertyType}
                          onChange={(propertyType) => setFormData({ ...formData, propertyType })}
                          options={propertyTypeOptions}
                          placeholder="Select or add property type…"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Contact Name</Label>
                        <Input value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} />
                      </div>
                    </>
                  ),
                },
                {
                  key: "payment",
                  title: "Payment",
                  content: (
                    <>
                      <div className="grid gap-2">
                        <Label>Rent amount</Label>
                        <AmountInput storedUsd={formData.rentAmount} onChange={(rentAmount) => setFormData({ ...formData, rentAmount })} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Payment Frequency</Label>
                        <Select value={formData.paymentFrequency} onValueChange={(v) => setFormData({ ...formData, paymentFrequency: v as RentRecord["paymentFrequency"] })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Due Date</Label>
                        <Input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
                      </div>
                    </>
                  ),
                },
                {
                  key: "payer",
                  title: "Payer",
                  content: (
                    <>
                      <div className="grid gap-2">
                        <Label>Payer Name</Label>
                        <Input value={formData.payerName} onChange={(e) => setFormData({ ...formData, payerName: e.target.value })} placeholder="Tenant name" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Payer Email</Label>
                        <Input type="email" value={formData.payerEmail} onChange={(e) => setFormData({ ...formData, payerEmail: e.target.value })} placeholder="tenant@example.com" />
                        <p className="text-xs text-muted-foreground">Used for automated payment reminders.</p>
                      </div>
                    </>
                  ),
                },
                {
                  key: "finish",
                  title: "Finish",
                  content: (
                    <>
                      <div className="grid gap-2">
                        <Label>Contract Start</Label>
                        <Input type="date" value={formData.contractStartDate} onChange={(e) => setFormData({ ...formData, contractStartDate: e.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Contract End</Label>
                        <Input type="date" value={formData.contractEndDate} onChange={(e) => setFormData({ ...formData, contractEndDate: e.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Status</Label>
                        <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as RecordStatus })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{statusOpts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Notes</Label>
                        <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
                      </div>
                    </>
                  ),
                },
              ]}
            />
          ) : null}

          <div className={cn("grid gap-3 mt-1", isMobile && "hidden")}>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Title</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} /></div>
              <div className="grid gap-2">
                <Label>Property Type</Label>
                <CreatableSelect
                  value={formData.propertyType}
                  onChange={(propertyType) => setFormData({ ...formData, propertyType })}
                  options={propertyTypeOptions}
                  placeholder="Select or add property type…"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Contact Name</Label><Input value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} /></div>
              <AmountInput storedUsd={formData.rentAmount} onChange={(rentAmount) => setFormData({ ...formData, rentAmount })} />
            </div>
            <div className="grid gap-2">
              <Label>Payer Name</Label>
              <Input
                value={formData.payerName}
                onChange={(e) => setFormData({ ...formData, payerName: e.target.value })}
                placeholder="Tenant name"
              />
            </div>
            <div className="grid gap-2">
              <Label>Payer Email</Label>
              <Input
                type="email"
                value={formData.payerEmail}
                onChange={(e) => setFormData({ ...formData, payerEmail: e.target.value })}
                placeholder="tenant@example.com"
              />
              <p className="text-xs text-muted-foreground">Used for automated payment reminders.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Payment Frequency</Label>
                <Select value={formData.paymentFrequency} onValueChange={(v) => setFormData({ ...formData, paymentFrequency: v as RentRecord["paymentFrequency"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Due Date</Label><Input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Contract Start</Label><Input type="date" value={formData.contractStartDate} onChange={(e) => setFormData({ ...formData, contractStartDate: e.target.value })} /></div>
              <div><Label>Contract End</Label><Input type="date" value={formData.contractEndDate} onChange={(e) => setFormData({ ...formData, contractEndDate: e.target.value })} /></div>
            </div>
            <div><Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as RecordStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{statusOpts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} /></div>
            <Button onClick={() => void handleSave()} className="w-full" disabled={saving}>
              {saving ? "Saving..." : (editing ? "Save Changes" : "Add Rent Record")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteId(null);
        }}
        onConfirm={() => void confirmDelete()}
        isLoading={deleting}
        confirmLabel="Delete"
      />
    </div>
  );
}
