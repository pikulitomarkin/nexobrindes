import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/PhoneInput";
import { CpfCnpjInput } from "@/components/CpfCnpjInput";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Users, ShoppingCart, Handshake, Factory, Edit, Trash2, Eye, EyeOff, RefreshCw, User, Mail, Phone, MapPin, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const clientFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  cpfCnpj: z.string().optional(),
  address: z.string().optional(),
  vendorId: z.string().optional(),
});

const vendorFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional().or(z.literal("")),
  phone: z.string().optional(),
  commissionRate: z.string().min(1, "Taxa de comissão é obrigatória"),
  photoUrl: z.string().optional(),
});

const partnerFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional().or(z.literal("")),
  phone: z.string().optional(),
  commissionRate: z.string().min(1, "Taxa de comissão é obrigatória"),
});

const producerFormSchema = z.object({
  name: z.string().min(2, "Nome/Empresa deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional().or(z.literal("")),
  phone: z.string().min(10, "Telefone inválido"),
  specialty: z.string().min(2, "Especialidade é obrigatória"),
  address: z.string().min(5, "Endereço é obrigatório"),
});

const financeFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional().or(z.literal("")),
  phone: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;
type VendorFormValues = z.infer<typeof vendorFormSchema>;
type PartnerFormValues = z.infer<typeof partnerFormSchema>;
type ProducerFormValues = z.infer<typeof producerFormSchema>;
type FinanceFormValues = z.infer<typeof financeFormSchema>;

export default function AdminUsers() {
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState("clients");
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [isPartnerDialogOpen, setIsPartnerDialogOpen] = useState(false);
  const [isProducerDialogOpen, setIsProducerDialogOpen] = useState(false);
  const [isFinanceDialogOpen, setIsFinanceDialogOpen] = useState(false);
  const [clientUserCode, setClientUserCode] = useState("");
  const [vendorUserCode, setVendorUserCode] = useState("");
  const [partnerUserCode, setPartnerUserCode] = useState("");
  const [producerUserCode, setProducerUserCode] = useState("");
  const [financeUserCode, setFinanceUserCode] = useState("");
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [editingProducerId, setEditingProducerId] = useState<string | null>(null);
  const [editingFinanceId, setEditingFinanceId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);

  // Detectar tab na URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location]);

  // Get all users
  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  // Get clients for Clients tab (has client.id for edit/delete)
  const { data: clientsData } = useQuery({
    queryKey: ["/api/clients"],
  });

  // Get full data for vendors, partners, producers (for edit and client assignment)
  const { data: vendorsData } = useQuery({
    queryKey: ["/api/vendors"],
  });
  const vendors = vendorsData;
  const { data: partnersData } = useQuery({
    queryKey: ["/api/partners"],
  });
  const { data: producersData } = useQuery({
    queryKey: ["/api/producers"],
  });

  // Forms
  const clientForm = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      phone: "",
      whatsapp: "",
      cpfCnpj: "",
      address: "",
      vendorId: "",
    },
  });

  const vendorForm = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      phone: "",
      commissionRate: "10.00",
      photoUrl: "",
    },
  });

  const partnerForm = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      phone: "",
      commissionRate: "15.00",
    },
  });

  const producerForm = useForm<ProducerFormValues>({
    resolver: zodResolver(producerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      specialty: "",
      address: "",
    },
  });

  const financeForm = useForm<FinanceFormValues>({
    resolver: zodResolver(financeFormSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      phone: "",
    },
  });

  // Mutations
  const createClientMutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      const payload = {
        userCode: data.username,
        password: data.password,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        cpfCnpj: data.cpfCnpj || null,
        address: data.address || null,
        vendorId: data.vendorId || null,
      };
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao criar cliente");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsClientDialogOpen(false);
      setEditingClientId(null);
      clientForm.reset();
      toast({
        title: "Sucesso!",
        description: "Cliente criado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ClientFormValues> }) => {
      const updateData: Record<string, unknown> = { ...data };
      if (!updateData.password || (updateData.password as string).trim() === "") {
        delete updateData.password;
      }
      delete updateData.username; // username is in users table, client API only updates clients table
      const response = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao atualizar cliente");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsClientDialogOpen(false);
      setEditingClientId(null);
      clientForm.reset();
      toast({ title: "Sucesso!", description: "Cliente atualizado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const response = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao excluir cliente");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setDeleteTarget(null);
      toast({ title: "Sucesso!", description: "Cliente excluído com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setDeleteTarget(null);
    },
  });

  const createVendorMutation = useMutation({
    mutationFn: async (data: VendorFormValues) => {
      const payload = {
        ...data,
        userCode: data.username,
      };
      const response = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao criar vendedor");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setIsVendorDialogOpen(false);
      setEditingVendorId(null);
      vendorForm.reset();
      toast({
        title: "Sucesso!",
        description: "Vendedor criado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VendorFormValues> }) => {
      const updateData = { ...data };
      if (!updateData.password || (updateData.password as string).trim() === "") {
        delete updateData.password;
      }
      const response = await fetch(`/api/vendors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao atualizar vendedor");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setIsVendorDialogOpen(false);
      setEditingVendorId(null);
      vendorForm.reset();
      toast({ title: "Sucesso!", description: "Vendedor atualizado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      const response = await fetch(`/api/vendors/${vendorId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao excluir vendedor");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setDeleteTarget(null);
      toast({ title: "Sucesso!", description: "Vendedor excluído com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setDeleteTarget(null);
    },
  });

  const createPartnerMutation = useMutation({
    mutationFn: async (data: PartnerFormValues) => {
      const partnerData = {
        ...data,
        username: partnerUserCode,
      };
      const response = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partnerData),
      });
      if (!response.ok) throw new Error("Erro ao criar parceiro");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      setIsPartnerDialogOpen(false);
      setEditingPartnerId(null);
      partnerForm.reset();
      toast({
        title: "Sucesso!",
        description: `Parceiro criado com sucesso! Código de acesso: ${partnerUserCode}`,
      });
    },
  });

  const updatePartnerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PartnerFormValues> }) => {
      const updateData = { ...data };
      if (!updateData.password || (updateData.password as string).trim() === "") {
        delete updateData.password;
      }
      const response = await fetch(`/api/partners/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao atualizar sócio");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      setIsPartnerDialogOpen(false);
      setEditingPartnerId(null);
      partnerForm.reset();
      toast({ title: "Sucesso!", description: "Sócio atualizado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deletePartnerMutation = useMutation({
    mutationFn: async (partnerId: string) => {
      const response = await fetch(`/api/partners/${partnerId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao excluir sócio");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      setDeleteTarget(null);
      toast({ title: "Sucesso!", description: "Sócio excluído com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setDeleteTarget(null);
    },
  });

  const createProducerMutation = useMutation({
    mutationFn: async (data: ProducerFormValues) => {
      const producerData = {
        ...data,
        username: producerUserCode,
      };
      const response = await fetch("/api/producers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(producerData),
      });
      if (!response.ok) throw new Error("Erro ao criar produtor");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/producers"] });
      setIsProducerDialogOpen(false);
      setEditingProducerId(null);
      producerForm.reset();
      toast({
        title: "Sucesso!",
        description: `Produtor criado com sucesso! Código de acesso: ${producerUserCode}`,
      });
    },
  });

  const updateProducerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProducerFormValues> }) => {
      const updateData = { ...data };
      if (!updateData.password || (updateData.password as string).trim() === "") {
        delete updateData.password;
      }
      const response = await fetch(`/api/producers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao atualizar produtor");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/producers"] });
      setIsProducerDialogOpen(false);
      setEditingProducerId(null);
      producerForm.reset();
      toast({ title: "Sucesso!", description: "Produtor atualizado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteProducerMutation = useMutation({
    mutationFn: async (producerId: string) => {
      const response = await fetch(`/api/producers/${producerId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao excluir produtor");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/producers"] });
      setDeleteTarget(null);
      toast({ title: "Sucesso!", description: "Produtor excluído com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setDeleteTarget(null);
    },
  });

  const createFinanceMutation = useMutation({
    mutationFn: async (data: FinanceFormValues) => {
      const financeData = {
        ...data,
        role: "finance",
        username: financeUserCode,
      };
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(financeData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar usuário financeiro");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsFinanceDialogOpen(false);
      setEditingFinanceId(null);
      financeForm.reset();
      toast({
        title: "Sucesso!",
        description: `Usuário financeiro criado com sucesso! Código de acesso: ${financeUserCode}`,
      });
    },
  });

  const updateFinanceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FinanceFormValues> }) => {
      const updateData = { ...data };
      if (!updateData.password || (updateData.password as string).trim() === "") {
        delete updateData.password;
      }
      const response = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao atualizar usuário" );
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsFinanceDialogOpen(false);
      setEditingFinanceId(null);
      financeForm.reset();
      toast({ title: "Sucesso!", description: "Usuário atualizado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteFinanceMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao excluir usuário");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDeleteTarget(null);
      toast({ title: "Sucesso!", description: "Usuário excluído com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setDeleteTarget(null);
    },
  });

  // Code generation functions
  const generateClientUserCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `CLI${timestamp}${randomStr}`;
  };

  const generateVendorUserCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `VEN${timestamp}${randomStr}`;
  };

  const generatePartnerUserCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PAR${timestamp}${randomStr}`;
  };

  const generateProducerUserCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PRO${timestamp}${randomStr}`;
  };

  const generateFinanceUserCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `FIN${timestamp}${randomStr}`;
  };

  // Effects to generate codes when dialogs open
  useEffect(() => {
    if (isClientDialogOpen) {
      setClientUserCode(generateClientUserCode());
    }
  }, [isClientDialogOpen]);

  useEffect(() => {
    if (isVendorDialogOpen) {
      setVendorUserCode(generateVendorUserCode());
    }
  }, [isVendorDialogOpen]);

  useEffect(() => {
    if (isPartnerDialogOpen) {
      setPartnerUserCode(generatePartnerUserCode());
    }
  }, [isPartnerDialogOpen]);

  useEffect(() => {
    if (isProducerDialogOpen) {
      setProducerUserCode(generateProducerUserCode());
    }
  }, [isProducerDialogOpen]);

  useEffect(() => {
    if (isFinanceDialogOpen) {
      const code = generateFinanceUserCode();
      setFinanceUserCode(code);
      financeForm.setValue("username", code);
    }
  }, [isFinanceDialogOpen, financeForm]);

  // Submit handlers
  const onClientSubmit = (data: ClientFormValues) => {
    if (editingClientId) {
      updateClientMutation.mutate({ id: editingClientId, data });
    } else {
      if (!data.password || (data.password as string).trim().length < 6) {
        toast({ title: "Erro", description: "Senha é obrigatória (mín. 6 caracteres)", variant: "destructive" });
        return;
      }
      createClientMutation.mutate(data);
    }
  };

  const onVendorSubmit = (data: VendorFormValues) => {
    if (editingVendorId) {
      updateVendorMutation.mutate({ id: editingVendorId, data });
    } else {
      if (!data.password || (data.password as string).trim().length < 6) {
        toast({ title: "Erro", description: "Senha é obrigatória (mín. 6 caracteres)", variant: "destructive" });
        return;
      }
      createVendorMutation.mutate(data);
    }
  };

  const onPartnerSubmit = (data: PartnerFormValues) => {
    if (editingPartnerId) {
      updatePartnerMutation.mutate({ id: editingPartnerId, data });
    } else {
      if (!data.password || (data.password as string).trim().length < 6) {
        toast({ title: "Erro", description: "Senha é obrigatória (mín. 6 caracteres)", variant: "destructive" });
        return;
      }
      createPartnerMutation.mutate(data);
    }
  };

  const onProducerSubmit = (data: ProducerFormValues) => {
    if (editingProducerId) {
      updateProducerMutation.mutate({ id: editingProducerId, data });
    } else {
      if (!data.password || (data.password as string).trim().length < 6) {
        toast({ title: "Erro", description: "Senha é obrigatória (mín. 6 caracteres)", variant: "destructive" });
        return;
      }
      createProducerMutation.mutate({ ...data, username: producerUserCode });
    }
  };

  const onFinanceSubmit = (data: FinanceFormValues) => {
    if (editingFinanceId) {
      updateFinanceMutation.mutate({ id: editingFinanceId, data });
    } else {
      if (!data.password || (data.password as string).trim().length < 6) {
        toast({ title: "Erro", description: "Senha é obrigatória (mín. 6 caracteres)", variant: "destructive" });
        return;
      }
      createFinanceMutation.mutate(data);
    }
  };

  const handleEditClient = (client: any) => {
    setEditingClientId(client.id);
    clientForm.reset({
      name: client.name || "",
      email: client.email || "",
      username: client.userCode || client.username || "",
      password: "",
      phone: client.phone || "",
      whatsapp: client.whatsapp || "",
      cpfCnpj: client.cpfCnpj || "",
      address: client.address || "",
      vendorId: client.vendorId || "",
    });
    setIsClientDialogOpen(true);
  };

  const handleDeleteClient = (client: any) => {
    setDeleteTarget({ type: "client", id: client.id, name: client.name });
  };

  const handleEditVendor = (vendor: any) => {
    setEditingVendorId(vendor.id);
    vendorForm.reset({
      name: vendor.name || "",
      email: vendor.email || "",
      username: vendor.userCode || vendor.username || "",
      password: "",
      phone: vendor.phone || "",
      commissionRate: vendor.commissionRate || "10.00",
      photoUrl: vendor.photoUrl || "",
    });
    setIsVendorDialogOpen(true);
  };

  const handleDeleteVendor = (vendor: any) => {
    setDeleteTarget({ type: "vendor", id: vendor.id, name: vendor.name });
  };

  const handleEditPartner = (partner: any) => {
    setEditingPartnerId(partner.id);
    partnerForm.reset({
      name: partner.name || "",
      email: partner.email || "",
      username: partner.userCode || partner.username || "",
      password: "",
      phone: partner.phone || "",
      commissionRate: partner.commissionRate || "15.00",
    });
    setIsPartnerDialogOpen(true);
  };

  const handleDeletePartner = (partner: any) => {
    setDeleteTarget({ type: "partner", id: partner.id, name: partner.name });
  };

  const handleEditProducer = (producer: any) => {
    setEditingProducerId(producer.id);
    producerForm.reset({
      name: producer.name || "",
      email: producer.email || "",
      password: "",
      phone: producer.phone || "",
      specialty: producer.specialty || "",
      address: producer.address || "",
    });
    setIsProducerDialogOpen(true);
  };

  const handleDeleteProducer = (producer: any) => {
    setDeleteTarget({ type: "producer", id: producer.id, name: producer.name });
  };

  const handleEditFinance = (user: any) => {
    setEditingFinanceId(user.id);
    financeForm.reset({
      name: user.name || "",
      email: user.email || "",
      username: user.username || "",
      password: "",
      phone: user.phone || "",
    });
    setIsFinanceDialogOpen(true);
  };

  const handleDeleteFinance = (user: any) => {
    setDeleteTarget({ type: "finance", id: user.id, name: user.name });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    switch (deleteTarget.type) {
      case "client": deleteClientMutation.mutate(deleteTarget.id); break;
      case "vendor": deleteVendorMutation.mutate(deleteTarget.id); break;
      case "partner": deletePartnerMutation.mutate(deleteTarget.id); break;
      case "producer": deleteProducerMutation.mutate(deleteTarget.id); break;
      case "finance": deleteFinanceMutation.mutate(deleteTarget.id); break;
      default: setDeleteTarget(null);
    }
  };

  // Filter users by role - use API data where we need entity id for edit/delete
  const clients = clientsData || [];
  const vendorUsers = vendorsData || users?.filter((u: any) => u.role === 'vendor') || [];
  const partners = partnersData || users?.filter((u: any) => u.role === 'partner') || [];
  const producers = producersData || users?.filter((u: any) => u.role === 'producer') || [];
  const financeUsers = users?.filter((u: any) => u.role === 'finance') || [];

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const getRoleLabel = (role: string) => {
    const labels = {
      admin: 'Administrador',
      vendor: 'Vendedor',
      client: 'Cliente',
      producer: 'Produtor',
      partner: 'Sócio',
      finance: 'Financeiro'
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getRoleIcon = (role: string) => {
    const icons = {
      admin: Users,
      vendor: ShoppingCart,
      client: Users,
      producer: Factory,
      partner: Handshake,
      finance: Users
    };
    const Icon = icons[role as keyof typeof icons] || Users;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciar Usuários</h1>
        <p className="text-gray-600">Cadastre e gerencie todos os usuários do sistema</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="clients" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Clientes ({clients.length})
          </TabsTrigger>
          <TabsTrigger value="vendors" className="flex items-center">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Vendedores ({vendorUsers.length})
          </TabsTrigger>
          <TabsTrigger value="partners" className="flex items-center">
            <Handshake className="h-4 w-4 mr-2" />
            Sócios ({partners.length})
          </TabsTrigger>
          <TabsTrigger value="producers" className="flex items-center">
            <Factory className="h-4 w-4 mr-2" />
            Produtores ({producers.length})
          </TabsTrigger>
          <TabsTrigger value="finance" className="flex items-center">
            <DollarSign className="h-4 w-4 mr-2" />
            Financeiro ({financeUsers.length})
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center">
            <Eye className="h-4 w-4 mr-2" />
            Visão Geral
          </TabsTrigger>
        </TabsList>

        {/* Clientes */}
        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Clientes
                </CardTitle>
                <Dialog open={isClientDialogOpen} onOpenChange={(open) => { setIsClientDialogOpen(open); if (!open) setEditingClientId(null); }}>
                  <DialogTrigger asChild>
                    <Button className="gradient-bg text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Cliente
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingClientId ? "Editar Cliente" : "Cadastrar Novo Cliente"}</DialogTitle>
                      <DialogDescription>
                        {editingClientId ? "Atualize os dados do cliente" : "Preencha os dados do cliente para criar uma nova conta"}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...clientForm}>
                      <form onSubmit={clientForm.handleSubmit(onClientSubmit)} className="space-y-4">
                        <FormField
                          control={clientForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome Completo *</FormLabel>
                              <FormControl>
                                <Input placeholder="João Silva" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={clientForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email *</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="joao@email.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={clientForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username *</FormLabel>
                                <FormControl>
                                  <Input placeholder="joao.silva" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={clientForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Senha *</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    {...field}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                  >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={clientForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefone</FormLabel>
                                <FormControl>
                                  <PhoneInput {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={clientForm.control}
                            name="whatsapp"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>WhatsApp</FormLabel>
                                <FormControl>
                                  <PhoneInput {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={clientForm.control}
                          name="cpfCnpj"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CPF/CNPJ</FormLabel>
                              <FormControl>
                                <CpfCnpjInput value={field.value ?? ""} onChange={field.onChange} placeholder="123.456.789-00 ou 00.000.000/0001-00" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={clientForm.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Endereço</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Rua das Flores, 123, Centro, São Paulo, SP"
                                  rows={3}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={clientForm.control}
                          name="vendorId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vendedor Responsável</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um vendedor" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {vendors?.map((vendor: any) => (
                                    <SelectItem key={vendor.id} value={vendor.id}>
                                      {vendor.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsClientDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            className="gradient-bg text-white"
                            disabled={createClientMutation.isPending || updateClientMutation.isPending}
                          >
                            {(createClientMutation.isPending || updateClientMutation.isPending) ? "Salvando..." : (editingClientId ? "Atualizar Cliente" : "Criar Cliente")}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {clients.map((client: any) => (
                      <tr key={client.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{client.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.userCode || client.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`status-badge ${client.isActive !== false ? 'status-confirmed' : 'status-cancelled'}`}>
                            {client.isActive !== false ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button variant="ghost" size="sm" className="mr-2" onClick={() => handleEditClient(client)} title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteClient(client)} title="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendedores */}
        <TabsContent value="vendors">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Vendedores
                </CardTitle>
                <Dialog open={isVendorDialogOpen} onOpenChange={(open) => { setIsVendorDialogOpen(open); if (!open) setEditingVendorId(null); }}>
                  <DialogTrigger asChild>
                    <Button className="gradient-bg text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Vendedor
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingVendorId ? "Editar Vendedor" : "Cadastrar Novo Vendedor"}</DialogTitle>
                      <DialogDescription>
                        {editingVendorId ? "Atualize os dados do vendedor" : "Preencha os dados do vendedor para criar uma nova conta"}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...vendorForm}>
                      <form onSubmit={vendorForm.handleSubmit(onVendorSubmit)} className="space-y-4">
                        <FormField
                          control={vendorForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome Completo *</FormLabel>
                              <FormControl>
                                <Input placeholder="Maria Santos" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={vendorForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email *</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="maria@email.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={vendorForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username *</FormLabel>
                                <FormControl>
                                  <Input placeholder="maria.santos" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={vendorForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Senha *</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    {...field}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                  >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={vendorForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefone</FormLabel>
                                <FormControl>
                                  <PhoneInput {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={vendorForm.control}
                            name="commissionRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Taxa de Comissão (%) *</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="10.00" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={vendorForm.control}
                          name="photoUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>URL da Foto</FormLabel>
                              <FormControl>
                                <Input placeholder="https://exemplo.com/foto.jpg" {...field} />
                              </FormControl>
                              <p className="text-xs text-gray-500">Cole o link de uma foto do vendedor</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsVendorDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            className="gradient-bg text-white"
                            disabled={createVendorMutation.isPending || updateVendorMutation.isPending}
                          >
                            {(createVendorMutation.isPending || updateVendorMutation.isPending) ? "Salvando..." : (editingVendorId ? "Atualizar Vendedor" : "Criar Vendedor")}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vendorUsers.map((vendor: any) => (
                      <tr key={vendor.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vendor.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vendor.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vendor.userCode || vendor.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`status-badge ${vendor.isActive !== false ? 'status-confirmed' : 'status-cancelled'}`}>
                            {vendor.isActive !== false ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button variant="ghost" size="sm" className="mr-2" onClick={() => handleEditVendor(vendor)} title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteVendor(vendor)} title="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sócios */}
        <TabsContent value="partners">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <Handshake className="h-5 w-5 mr-2" />
                  Sócios
                </CardTitle>
                <Dialog open={isPartnerDialogOpen} onOpenChange={(open) => { setIsPartnerDialogOpen(open); if (!open) setEditingPartnerId(null); }}>
                  <DialogTrigger asChild>
                    <Button className="gradient-bg text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Sócio
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingPartnerId ? "Editar Sócio" : "Cadastrar Novo Sócio"}</DialogTitle>
                      <DialogDescription>
                        {editingPartnerId ? "Atualize os dados do sócio" : "Preencha os dados do sócio para criar uma nova conta"}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...partnerForm}>
                      <form onSubmit={partnerForm.handleSubmit(onPartnerSubmit)} className="space-y-4">
                        <FormField
                          control={partnerForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome Completo *</FormLabel>
                              <FormControl>
                                <Input placeholder="João Sócio" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={partnerForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email *</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="joao@email.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={partnerForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username *</FormLabel>
                                <FormControl>
                                  <Input placeholder="joao.socio" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={partnerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Senha *</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    {...field}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                  >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={partnerForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefone</FormLabel>
                                <FormControl>
                                  <PhoneInput {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={partnerForm.control}
                            name="commissionRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Taxa de Comissão (%) *</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="15.00" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end space-x-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsPartnerDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            className="gradient-bg text-white"
                            disabled={createPartnerMutation.isPending || updatePartnerMutation.isPending}
                          >
                            {(createPartnerMutation.isPending || updatePartnerMutation.isPending) ? "Salvando..." : (editingPartnerId ? "Atualizar Sócio" : "Criar Sócio")}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {partners.map((partner: any) => (
                      <tr key={partner.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{partner.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{partner.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{partner.userCode || partner.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`status-badge ${partner.isActive !== false ? 'status-confirmed' : 'status-cancelled'}`}>
                            {partner.isActive !== false ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button variant="ghost" size="sm" className="mr-2" onClick={() => handleEditPartner(partner)} title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeletePartner(partner)} title="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Produtores */}
        <TabsContent value="producers">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <Factory className="h-5 w-5 mr-2" />
                  Produtores
                </CardTitle>
                <Dialog open={isProducerDialogOpen} onOpenChange={(open) => { setIsProducerDialogOpen(open); if (!open) setEditingProducerId(null); }}>
                  <DialogTrigger asChild>
                    <Button className="gradient-bg text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Produtor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingProducerId ? "Editar Produtor" : "Cadastrar Novo Produtor"}</DialogTitle>
                      <DialogDescription>
                        {editingProducerId ? "Atualize os dados do produtor" : "Preencha os dados completos do produtor"}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...producerForm}>
                      <form onSubmit={producerForm.handleSubmit(onProducerSubmit)} className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <FormLabel className="text-blue-700">Código de Acesso do Produtor</FormLabel>
                              <div className="flex items-center mt-1">
                                <User className="h-4 w-4 text-blue-600" />
                                <span className="font-mono font-bold text-blue-800">{producerUserCode}</span>
                              </div>
                              <p className="text-xs text-blue-600 mt-1">Este código será usado para login no sistema</p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setProducerUserCode(generateProducerUserCode())}
                              className="border-blue-300 text-blue-600 hover:bg-blue-100"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <FormField
                          control={producerForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome/Empresa *</FormLabel>
                              <FormControl>
                                <Input placeholder="Marcenaria Santos" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={producerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Senha de Acesso *</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Digite uma senha" {...field} />
                              </FormControl>
                              <FormMessage />
                              <p className="text-xs text-gray-600">Senha que o produtor usará para acessar o sistema</p>
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={producerForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="contato@marcenariasantos.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={producerForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefone *</FormLabel>
                                <FormControl>
                                  <PhoneInput {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={producerForm.control}
                          name="specialty"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>O que produz (Especialidade) *</FormLabel>
                              <FormControl>
                                <Input placeholder="Móveis sob medida, Cadeiras, Mesas..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={producerForm.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Endereço Completo *</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Rua Industrial, 456, Distrito Industrial, São Paulo, SP"
                                  rows={3}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsProducerDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            className="gradient-bg text-white"
                            disabled={createProducerMutation.isPending || updateProducerMutation.isPending}
                          >
                            {(createProducerMutation.isPending || updateProducerMutation.isPending) ? "Salvando..." : (editingProducerId ? "Atualizar Produtor" : "Criar Produtor")}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {producers?.map((producer: any) => (
                  <Card key={producer.id} className="card-hover">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{producer.name}</h3>
                          <div className="flex items-center mt-2">
                            <User className="h-4 w-4 text-blue-600 mr-2" />
                            <div className="bg-blue-100 border border-blue-300 px-3 py-1.5 rounded-lg">
                              <span className="text-sm font-mono font-bold text-blue-800">
                                {producer.username}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">Código de acesso para login</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" title="Editar" onClick={() => handleEditProducer(producer)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600" title="Excluir" onClick={() => handleDeleteProducer(producer)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {producer.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{producer.email}</span>
                          </div>
                        )}
                        {producer.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span>{producer.phone}</span>
                          </div>
                        )}
                        {producer.specialty && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Factory className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span>{producer.specialty}</span>
                          </div>
                        )}
                        {producer.address && (
                          <div className="flex items-start text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{producer.address}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Status:</span>
                          <span className={`font-medium ${producer.isActive ? 'text-green-600' : 'text-red-600'}`}>
                            {producer.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {producers?.length === 0 && (
                <div className="text-center py-12">
                  <Factory className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhum produtor cadastrado</h3>
                  <p className="text-gray-500 mb-4">Cadastre produtores para expandir sua rede de produção</p>
                  <Button onClick={() => setIsProducerDialogOpen(true)} className="gradient-bg text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar Primeiro Produtor
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visão Geral */}
        <TabsContent value="finance">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Usuários Financeiros
                </CardTitle>
                <Dialog open={isFinanceDialogOpen} onOpenChange={(open) => { setIsFinanceDialogOpen(open); if (!open) setEditingFinanceId(null); }}>
                  <DialogTrigger asChild>
                    <Button className="gradient-bg text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Usuário Financeiro
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>{editingFinanceId ? "Editar Usuário Financeiro" : "Cadastrar Usuário Financeiro"}</DialogTitle>
                      <DialogDescription>
                        {editingFinanceId ? "Atualize os dados do usuário" : "Crie um novo acesso para o módulo financeiro."}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...financeForm}>
                      <form onSubmit={financeForm.handleSubmit(onFinanceSubmit)} className="space-y-4">
                        <FormField
                          control={financeForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome Completo *</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome do responsável" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={financeForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="financeiro@empresa.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormItem>
                            <FormLabel>Username (Gerado)</FormLabel>
                            <FormControl>
                              <Input 
                                {...financeForm.register("username")}
                                value={financeUserCode} 
                                readOnly 
                                className="bg-gray-50" 
                              />
                            </FormControl>
                          </FormItem>
                        </div>
                        <FormField
                          control={financeForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Senha *</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    {...field}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                  >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button type="button" variant="outline" onClick={() => setIsFinanceDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button type="submit" className="gradient-bg text-white" disabled={createFinanceMutation.isPending || updateFinanceMutation.isPending}>
                            {(createFinanceMutation.isPending || updateFinanceMutation.isPending) ? "Salvando..." : (editingFinanceId ? "Atualizar Usuário" : "Cadastrar Usuário")}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Nome</th>
                      <th className="text-left py-3 px-4">Usuário</th>
                      <th className="text-left py-3 px-4">Email</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-right py-3 px-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(financeUsers) && financeUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-gray-500 italic">
                          Nenhum usuário financeiro cadastrado.
                        </td>
                      </tr>
                    ) : (
                      financeUsers.map((u: any) => (
                        <tr key={u.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{u.name}</td>
                          <td className="py-3 px-4">{u.username}</td>
                          <td className="py-3 px-4">{u.email || "-"}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Ativo</span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditFinance(u)} title="Editar"><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteFinance(u)} title="Excluir"><Trash2 className="h-4 w-4" /></Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir {deleteTarget?.name}? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Clientes</h3>
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-3xl font-bold gradient-text">{clients.length}</p>
                <p className="text-sm text-gray-600 mt-2">Total de clientes cadastrados</p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Vendedores</h3>
                  <ShoppingCart className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-3xl font-bold gradient-text">{vendorUsers.length}</p>
                <p className="text-sm text-gray-600 mt-2">Vendedores ativos no sistema</p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Parceiros</h3>
                  <Handshake className="h-6 w-6 text-purple-600" />
                </div>
                <p className="text-3xl font-bold gradient-text">{partners.length}</p>
                <p className="text-sm text-gray-600 mt-2">Parceiros de negócio</p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Produtores</h3>
                  <Factory className="h-6 w-6 text-orange-600" />
                </div>
                <p className="text-3xl font-bold gradient-text">{producers.length}</p>
                <p className="text-sm text-gray-600 mt-2">Rede de produção terceirizada</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}