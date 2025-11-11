import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Watch, Zap, Apple, Activity, CheckCircle2, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type DeviceProvider = Database['public']['Enums']['device_provider'];

interface DeviceConnection {
  id: string;
  provider: DeviceProvider;
  connected_at: string;
  last_sync_at: string | null;
}

const devices: Array<{
  id: DeviceProvider;
  name: string;
  icon: any;
  description: string;
  color: string;
}> = [
  {
    id: 'APPLE_HEALTH',
    name: 'Apple Health',
    icon: Apple,
    description: 'Sincroniza pasos, actividad y métricas de salud',
    color: 'text-gray-900 dark:text-gray-100',
  },
  {
    id: 'OURA',
    name: 'Oura Ring',
    icon: Zap,
    description: 'Monitoreo de sueño, frecuencia cardíaca y recuperación',
    color: 'text-blue-500',
  },
  {
    id: 'WHOOP',
    name: 'Whoop',
    icon: Activity,
    description: 'Strain, recuperación y análisis de sueño',
    color: 'text-red-500',
  },
  {
    id: 'APPLE_WATCH',
    name: 'Apple Watch',
    icon: Watch,
    description: 'Actividad, entrenamientos y métricas de fitness',
    color: 'text-gray-900 dark:text-gray-100',
  },
];

const DeviceSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [connections, setConnections] = useState<DeviceConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConnections();
  }, [user]);

  const fetchConnections = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('device_connections')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching device connections:", error);
      }
      toast.error("Error al cargar dispositivos conectados");
    } finally {
      setLoading(false);
    }
  };

  const isConnected = (deviceId: DeviceProvider) => {
    return connections.some(conn => conn.provider === deviceId);
  };

  const handleConnect = async (deviceId: DeviceProvider) => {
    if (!user) return;

    try {
      // In a real implementation, this would redirect to OAuth flow
      // For now, we'll simulate a connection
      const { error } = await supabase
        .from('device_connections')
        .insert({
          user_id: user.id,
          provider: deviceId,
          connected_at: new Date().toISOString(),
        });

      if (error) throw error;

      await fetchConnections();
      toast.success(`${devices.find(d => d.id === deviceId)?.name} conectado exitosamente`);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error connecting device:", error);
      }
      toast.error("Error al conectar dispositivo");
    }
  };

  const handleDisconnect = async (deviceId: DeviceProvider) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('device_connections')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', deviceId);

      if (error) throw error;

      await fetchConnections();
      toast.success(`${devices.find(d => d.id === deviceId)?.name} desconectado exitosamente`);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error disconnecting device:", error);
      }
      toast.error("Error al desconectar dispositivo");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dispositivos de Salud</h1>
            <p className="text-sm text-muted-foreground">Conecta tus dispositivos para sincronizar datos</p>
          </div>
        </div>

        {/* Connected Devices Count */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dispositivos conectados</p>
                <p className="text-2xl font-bold">{connections.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Devices */}
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground">Dispositivos Disponibles</h2>
          
          {devices.map((device) => {
            const connected = isConnected(device.id);
            const Icon = device.icon;
            
            return (
              <Card key={device.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${device.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{device.name}</CardTitle>
                          {connected && (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Conectado
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-sm mt-1">
                          {device.description}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {connected ? (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDisconnect(device.id)}
                      >
                        Desconectar
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm"
                        className="flex-1"
                        onClick={() => toast.info('Sincronización iniciada')}
                      >
                        Sincronizar
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      className="w-full" 
                      size="sm"
                      onClick={() => handleConnect(device.id)}
                    >
                      Conectar
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div className="text-sm">
                <p className="font-medium mb-1">Sincronización automática</p>
                <p className="text-muted-foreground text-xs">
                  Tus datos de salud se sincronizarán automáticamente cada hora cuando tu dispositivo esté conectado.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeviceSettings;
