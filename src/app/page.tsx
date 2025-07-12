
"use client";

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { UserForm } from '@/components/users/user-form';
import { addUser, getUserById } from '@/services/userService';
import type { User, CreateUserFormData } from '@/lib/schemas/user';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoggingIn(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      if (firebaseUser && firebaseUser.uid) {
        const userDataFromFirestore = await getUserById(firebaseUser.uid);
        if (userDataFromFirestore && userDataFromFirestore.role) {
          // Pass the user from Firestore and the user from Auth to the login function
          login(userDataFromFirestore, firebaseUser);
        } else {
          setError('Não foi possível determinar a função do usuário. Contate o suporte.');
          await auth.signOut(); 
        }
      } else {
        setError('Usuário não encontrado ou erro inesperado.');
      }
    } catch (firebaseError: any) {
      console.error("Firebase Login Error:", firebaseError);
      if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential' || firebaseError.code === 'auth/invalid-email') {
        setError('E-mail ou senha inválidos.');
      } else {
        setError('Ocorreu um erro ao tentar fazer login. Tente novamente.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const addUserMutation = useMutation({
    mutationFn: (formData: CreateUserFormData | User) => addUser(formData as CreateUserFormData),
    onSuccess: async (uid, formData) => {
      toast({
        title: "Cadastro Realizado!",
        description: "Seu usuário foi criado com sucesso. Por favor, faça login.",
        variant: "default"
      });
      setIsRegisterDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no Cadastro",
        description: `Não foi possível criar o usuário: ${error.message}`,
        variant: "destructive"
      });
    },
  });

  const handleRegisterUser = async (formData: CreateUserFormData | User) => {
    await addUserMutation.mutateAsync(formData);
  };


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-xl border-border">
        <CardHeader className="items-center text-center">
          <div className="mb-2">
            <Image
              src="/logoprincipal.png" 
              alt="DonPhone Logo Principal"
              width={360} 
              height={360}
              data-ai-hint="company logo"
              className="mx-auto"
              priority
            />
          </div>
          {/* <CardTitle className="font-headline text-3xl text-foreground">Sistema DonPhone</CardTitle> */}
          <CardDescription className="text-muted-foreground pt-2">Por favor, entre para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro de Login</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground/80">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground/80">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-base"
              />
            </div>
            <Button type="submit" className="w-full text-base bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoggingIn || addUserMutation.isPending}>
              {isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Entrar
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button
              variant="link"
              type="button"
              onClick={() => setIsRegisterDialogOpen(true)}
              className="text-sm px-0 text-primary hover:text-primary/80"
              disabled={isLoggingIn || addUserMutation.isPending}
            >
              Cadastrar Novo Usuário
            </Button>
          </div>
        </CardContent>
        <CardFooter className="justify-center pt-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Sistema DonPhone.
          </p>
        </CardFooter>
      </Card>

      <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
            <DialogDescription>
              Preencha seus dados para criar uma conta. Após o cadastro, você precisará fazer login.
            </DialogDescription>
          </DialogHeader>
          <UserForm
            onSubmit={handleRegisterUser}
            isLoading={addUserMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
