import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck } from "@/types/truck";
import truckApi from "@/services/truck-api";
import { toast } from "@/hooks/use-toast";

const truckSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  driver_name: z.string().min(1, "Nome do motorista é obrigatório"),
  license_plate: z.string().min(1, "Placa é obrigatória"),
  status: z.enum(["active", "inactive", "maintenance"]),
  capacity: z.number().min(1, "Capacidade deve ser maior que 0"),
  observations: z.string().optional(),
});

type TruckFormData = z.infer<typeof truckSchema>;

interface TruckRegistrationFormProps {
  truck?: Truck;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TruckRegistrationForm({ truck, onSuccess, onCancel }: TruckRegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<TruckFormData>({
    resolver: zodResolver(truckSchema),
    defaultValues: {
      name: truck?.name || "",
      driver_name: truck?.driver_name || "",
      license_plate: truck?.license_plate || "",
      status: truck?.status || "active",
      capacity: truck?.capacity || 0,
      observations: truck?.observations || "",
    },
  });

  useEffect(() => {
    if (truck) {
      const truckData: TruckFormData = {
        name: truck.name,
        driver_name: truck.driver_name,
        license_plate: truck.license_plate,
        status: truck.status,
        capacity: truck.capacity,
        observations: truck.observations || "",
      };
      form.reset(truckData);
    }
  }, [truck, form]);

  const onSubmit = async (data: TruckFormData) => {
    setIsSubmitting(true);
    try {
      if (truck) {
        await truckApi.updateTruck(truck.id, data);
        toast({
          title: "Caminhão atualizado",
          description: "Os dados do caminhão foram atualizados com sucesso.",
        });
      } else {
        await truckApi.createTruck(data);
        toast({
          title: "Caminhão cadastrado",
          description: "O caminhão foi cadastrado com sucesso.",
        });
      }
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar caminhão",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{truck ? "Editar Caminhão" : "Cadastrar Caminhão"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" type="text" placeholder="Nome do caminhão" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="driver_name">Nome do Motorista</Label>
              <Input id="driver_name" type="text" placeholder="Nome do motorista" {...form.register("driver_name")} />
              {form.formState.errors.driver_name && (
                <p className="text-sm text-red-500">{form.formState.errors.driver_name.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="license_plate">Placa</Label>
              <Input id="license_plate" type="text" placeholder="Placa do caminhão" {...form.register("license_plate")} />
              {form.formState.errors.license_plate && (
                <p className="text-sm text-red-500">{form.formState.errors.license_plate.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="capacity">Capacidade (Litros)</Label>
              <Input
                id="capacity"
                type="number"
                placeholder="Capacidade do caminhão"
                {...form.register("capacity", { valueAsNumber: true })}
              />
              {form.formState.errors.capacity && (
                <p className="text-sm text-red-500">{form.formState.errors.capacity.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select {...form.register("status")} defaultValue={truck?.status || "active"}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="maintenance">Manutenção</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.status && (
                <p className="text-sm text-red-500">{form.formState.errors.status.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea id="observations" placeholder="Observações" {...form.register("observations")} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : truck ? "Atualizar" : "Cadastrar"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
