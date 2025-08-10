import { EditProfileForm } from "@/components/EditProfileForm";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Navigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function EditProfile() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Edit Profile</h1>
        <p className="text-muted-foreground mt-2">
          Update your profile information. Changes will be published to all connected relays.
        </p>
      </div>
      
      <EditProfileForm />
    </div>
  );
}