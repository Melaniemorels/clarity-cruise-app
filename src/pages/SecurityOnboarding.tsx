import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Shield, Mail, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSecurityOnboarding } from "@/hooks/use-security-onboarding";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SecurityOnboarding = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { emailVerified, completeSecurityOnboarding, loading } = useSecurityOnboarding();
  const [isResending, setIsResending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Calculate progress
  const progress = emailVerified ? 100 : 0;

  const handleResendVerification = async () => {
    if (!user?.email) return;
    
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/security-onboarding`,
        },
      });

      if (error) throw error;
      toast.success(t('security.emailSent'));
    } catch (error: any) {
      console.error('Error resending verification:', error);
      toast.error(error.message || t('errors.generic'));
    } finally {
      setIsResending(false);
    }
  };

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      // Refresh the session to get updated email verification status
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      if (data.user?.email_confirmed_at) {
        toast.success(t('security.emailVerified'));
        // Force reload to update state
        window.location.reload();
      } else {
        toast.info(t('security.emailNotVerifiedYet'));
      }
    } catch (error: any) {
      console.error('Error refreshing session:', error);
      toast.error(error.message || t('errors.generic'));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleContinue = async () => {
    setIsCompleting(true);
    const success = await completeSecurityOnboarding();
    if (success) {
      // Navigate to device onboarding
      window.location.href = "/onboarding";
    }
    setIsCompleting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t('security.title')}</CardTitle>
          <CardDescription>{t('security.description')}</CardDescription>
          
          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{t('security.progress')}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Email Verification Step */}
          <div className={`p-4 rounded-xl border ${emailVerified ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5'}`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${emailVerified ? 'bg-primary/20' : 'bg-destructive/20'}`}>
                {emailVerified ? (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : (
                  <Mail className="w-5 h-5 text-destructive" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{t('security.emailVerification')}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {emailVerified 
                    ? t('security.emailVerifiedMessage') 
                    : t('security.emailNotVerifiedMessage')}
                </p>
                {user?.email && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {user.email}
                  </p>
                )}
              </div>
            </div>

            {!emailVerified && (
              <div className="mt-4 flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="flex-1"
                >
                  {isResending ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  {t('security.resendEmail')}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefreshStatus}
                  disabled={isRefreshing}
                  className="flex-1"
                >
                  {isRefreshing ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  {t('security.checkStatus')}
                </Button>
              </div>
            )}
          </div>

          {/* Warning if not verified */}
          {!emailVerified && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                {t('security.verifyWarning')}
              </p>
            </div>
          )}

          {/* Continue Button */}
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleContinue}
            disabled={!emailVerified || isCompleting}
          >
            {isCompleting ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {t('security.continue')}
          </Button>

          {/* Skip option (only if email is verified) */}
          {emailVerified && (
            <p className="text-center text-xs text-muted-foreground">
              {t('security.accountSecured')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityOnboarding;
