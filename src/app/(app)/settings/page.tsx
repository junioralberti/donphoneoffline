
"use client";

import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { getEstablishmentSettings, saveEstablishmentSettings, type EstablishmentSettings } from '@/services/settingsService';
import { exportDatabase, importDatabase } from '@/services/backupService';
import { Loader2, UploadCloud, Building, HardDrive, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";

// Define a type for the form state to avoid using 'any'
type SettingsFormState = Omit<EstablishmentSettings, 'updatedAt' | 'logoUrl'>;

export default function SettingsPage() {
    const [settings, setSettings] = useState<SettingsFormState>({
        businessName: '',
        businessAddress: '',
        businessCnpj: '',
        businessPhone: '',
        businessEmail: '',
    });
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isConfirmingImport, setIsConfirmingImport] = useState(false);
    const [fileToImport, setFileToImport] = useState<File | null>(null);
    const importFileInputRef = useRef<HTMLInputElement>(null);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: initialSettings, isLoading: isLoadingSettings } = useQuery<EstablishmentSettings | null, Error>({
        queryKey: ['establishmentSettings'],
        queryFn: getEstablishmentSettings,
    });

    useEffect(() => {
        if (initialSettings) {
            setSettings({
                businessName: initialSettings.businessName ?? '',
                businessAddress: initialSettings.businessAddress ?? '',
                businessCnpj: initialSettings.businessCnpj ?? '',
                businessPhone: initialSettings.businessPhone ?? '',
                businessEmail: initialSettings.businessEmail ?? '',
            });
            if (initialSettings.logoUrl) {
                setLogoPreview(initialSettings.logoUrl);
            }
        }
    }, [initialSettings]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setSettings(prev => ({ ...prev, [id]: value }));
    };

    const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 1 * 1024 * 1024) { // 1MB limit
                toast({ title: "Arquivo Muito Grande", description: "O logo deve ter no máximo 1MB.", variant: "destructive" });
                return;
            }
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };
    
    // NOTE: The save logic for the logo is now handled by Cloud Functions for security.
    // This client-side code will only save the text fields.
    // The logo upload is now a separate process handled by a dedicated function.
    const saveSettingsMutation = useMutation({
        mutationFn: (data: { settingsData: SettingsFormState }) => saveEstablishmentSettings(data.settingsData),
        onSuccess: (savedData) => {
            queryClient.setQueryData(['establishmentSettings'], savedData);
            toast({ title: "Configurações Salvas", description: "As informações da empresa foram atualizadas." });
        },
        onError: (err) => {
            toast({ title: "Erro ao Salvar", description: err.message, variant: "destructive" });
        },
        onSettled: () => {
            setIsSubmitting(false);
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        saveSettingsMutation.mutate({ settingsData: settings });
    };

    const handleExport = async () => {
        toast({ title: "Iniciando Exportação", description: "Aguarde enquanto preparamos o arquivo de backup..." });
        try {
            const data = await exportDatabase();
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const date = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `backup-donphone-${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast({ title: "Backup Concluído", description: "O arquivo de backup foi baixado com sucesso." });
        } catch (error: any) {
            toast({ title: "Erro no Backup", description: error.message, variant: "destructive" });
        }
    };

    const handleImportClick = () => {
        importFileInputRef.current?.click();
    };

    const handleFileSelectedForImport = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'application/json') {
                toast({ title: "Arquivo Inválido", description: "Por favor, selecione um arquivo de backup .json válido.", variant: "destructive" });
                return;
            }
            setFileToImport(file);
            setIsConfirmingImport(true);
        }
         // Reset file input to allow selecting the same file again
        if(e.target) e.target.value = '';
    };

    const handleConfirmImport = async () => {
        if (!fileToImport) return;
        setIsSubmitting(true);
        setIsConfirmingImport(false);
        toast({ title: "Iniciando Importação", description: "Não feche esta janela. Este processo pode demorar alguns minutos." });

        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const data = JSON.parse(event.target?.result as string);
                    await importDatabase(data);
                    toast({ title: "Importação Concluída!", description: "Os dados foram restaurados. A página será recarregada." });
                    setTimeout(() => window.location.reload(), 2000);
                } catch (parseError: any) {
                    toast({ title: "Erro ao Ler Arquivo", description: `O arquivo de backup está corrompido ou em formato inválido: ${parseError.message}`, variant: "destructive" });
                } finally {
                    setIsSubmitting(false);
                    setFileToImport(null);
                }
            };
            reader.onerror = () => {
                 toast({ title: "Erro de Leitura", description: "Não foi possível ler o arquivo selecionado.", variant: "destructive" });
                 setIsSubmitting(false);
                 setFileToImport(null);
            };
            reader.readAsText(fileToImport);
        } catch (error: any) {
            toast({ title: "Erro na Importação", description: error.message, variant: "destructive" });
            setIsSubmitting(false);
            setFileToImport(null);
        }
    };


    return (
        <div className="flex flex-col gap-6">
            <h1 className="font-headline text-3xl font-semibold text-accent">Configurações</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Building /> Dados da Empresa</CardTitle>
                    <CardDescription>
                        Informações utilizadas nos cabeçalhos de impressões e relatórios. O upload do logo deve ser feito pelo painel do Firebase Storage.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                   {isLoadingSettings ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                   ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {/* Text Fields */}
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="businessName">Nome do Estabelecimento</Label>
                                    <Input id="businessName" value={settings.businessName} onChange={handleInputChange} placeholder="Ex: DonPhone Assistência Técnica" />
                                </div>
                                 <div>
                                    <Label htmlFor="businessCnpj">CNPJ</Label>
                                    <Input id="businessCnpj" value={settings.businessCnpj} onChange={handleInputChange} placeholder="00.000.000/0001-00" />
                                </div>
                                <div>
                                    <Label htmlFor="businessAddress">Endereço</Label>
                                    <Input id="businessAddress" value={settings.businessAddress} onChange={handleInputChange} placeholder="Rua Exemplo, 123, Centro" />
                                </div>
                                <div>
                                    <Label htmlFor="businessPhone">Telefone</Label>
                                    <Input id="businessPhone" value={settings.businessPhone} onChange={handleInputChange} placeholder="(49) 99999-9999" />
                                </div>
                                <div>
                                    <Label htmlFor="businessEmail">E-mail</Label>
                                    <Input id="businessEmail" type="email" value={settings.businessEmail} onChange={handleInputChange} placeholder="contato@empresa.com" />
                                </div>
                            </div>
                           {/* Logo Section - Display only */}
                            <div className="space-y-2">
                                <Label>Logo da Empresa</Label>
                                <div className="w-48 h-48 border-2 border-dashed rounded-md flex items-center justify-center bg-muted/50">
                                    {logoPreview ? (
                                        <Image src={logoPreview} alt="Logo Preview" width={180} height={180} className="object-contain" data-ai-hint="company logo"/>
                                    ) : (
                                        <div className="text-center text-muted-foreground p-4">
                                            <Building className="mx-auto h-10 w-10 mb-2"/>
                                            <p className="text-sm">Nenhum logo definido</p>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Para alterar o logo, acesse o Firebase Console > Storage > `establishment_logo/app_logo`.
                                </p>
                            </div>
                        </div>
                        <div className="pt-4">
                           <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Alterações
                            </Button>
                        </div>
                    </form>
                   )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><HardDrive/> Backup e Restauração de Dados</CardTitle>
                    <CardDescription>Exporte todos os dados do sistema para um arquivo de backup ou importe um arquivo para restaurar o sistema.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4">
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Atenção!</AlertTitle>
                        <AlertDescription>
                            A importação de um arquivo de backup <strong>substituirá todos os dados atuais do sistema</strong>. Esta ação é irreversível. Faça um backup dos dados atuais antes de importar.
                        </AlertDescription>
                    </Alert>
                    <div className="flex gap-4">
                        <Button variant="secondary" onClick={handleExport} disabled={isSubmitting}>Exportar Dados (Backup)</Button>
                        <Button variant="destructive" onClick={handleImportClick} disabled={isSubmitting}>
                            {isSubmitting && fileToImport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Importar Dados (Restaurar)
                        </Button>
                        <input type="file" ref={importFileInputRef} onChange={handleFileSelectedForImport} accept=".json" className="hidden" />
                    </div>
                 </CardContent>
            </Card>

            <Dialog open={isConfirmingImport} onOpenChange={setIsConfirmingImport}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Importação de Dados</DialogTitle>
                        <DialogDescription>
                            Você está prestes a substituir <strong>todos os dados do sistema</strong> pelo conteúdo do arquivo <strong className="text-primary">{fileToImport?.name}</strong>.
                            <br/><br/>
                            Esta ação não pode ser desfeita.
                            <br/><br/>
                            Tem certeza que deseja continuar?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline" onClick={() => setFileToImport(null)}>Cancelar</Button></DialogClose>
                        <Button variant="destructive" onClick={handleConfirmImport}>Sim, substituir tudo</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
