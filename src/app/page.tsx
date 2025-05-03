"use client";

import "../app/globals.css";
import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, Loader2 } from "lucide-react";
import axios from "axios";
import { useCredits } from "./context/creditContext";
import { Toaster, toast } from "react-hot-toast";
import Image from "next/image";

export default function Home() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && session?.user;
  const { credits, setCredits } = useCredits();

  const [videoUrl, setVideoUrl] = useState("");
  const [format, setFormat] = useState("csv");
  const [time, setTime] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [downloadReady, setDownloadReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setDownloadReady(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown]);

  useEffect(() => {
    if (session?.user?.credits !== undefined) {
      setCredits(session.user.credits);
    }
  }, [session, setCredits]);

  useEffect(() => {
    setCountdown(null);
    setDownloadReady(false);
    setTime("");
  }, [videoUrl, format]);

  const extractYouTubeID = (url: string) => {
    const regex = /(?:youtube\.com\/.*v=|youtu\.be\/)([^&?/]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleDownload = async () => {
    try {
      const videoId = extractYouTubeID(videoUrl);
      if (!videoId) {
        toast.error("Invalid YouTube URL!");
        return;
      }

      setIsLoading(true);
      toast.loading("Fetching comments...");

      const response = await axios.post("https://6hb2lovzx6.execute-api.us-east-1.amazonaws.com/Prod/fetch-comments", {
        video_id: videoId,
        email: session?.user.email
      });

      toast.dismiss();

      if (response?.data?.credits !== undefined) {
        setCredits(Number(response?.data?.credits));
        if (Number(response?.data?.credits) <= 0) {
          toast.error("Credits exhausted! Please recharge.");
        } else {
          toast.success("Credits updated successfully!");
        }
      }

      const links = response?.data?.response?.download_links;
      const link = links?.[format.toLowerCase()];

      if (link) {
        toast.success("Download started!");
        const anchor = document.createElement("a");
        anchor.href = link;
        anchor.download = `${videoId}.${format.toLowerCase()}`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        return;
      }

      if (response?.data?.wait_for) {
        const seconds = Math.ceil(Number(response.data.wait_for)) + 5;
        setCountdown(seconds);
        setDownloadReady(false);
        toast("Preparing download link. Please don't refresh...", { icon: "⏳" });
      } else {
        setTime("Download link not ready yet.");
      }
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(`Failed to fetch comments. Please try again.${error}`);
      setTime("Error fetching comments. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load Razorpay Payment Button script
  useEffect(() => {
    const container = document.getElementById("razorpay-button-container");
    if (container) {
      // Clear previous content (optional but good practice)
      container.innerHTML = "";
  
      // Create a form
      const form = document.createElement("form");
      form.action = "https://checkout.razorpay.com/v1/payment-button.js";
      form.method = "post";
  
      // Create script tag inside the form
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/payment-button.js";
      script.setAttribute("data-payment_button_id", "pl_Q5KpbAz1ebleF7");
      script.async = true;
  
      form.appendChild(script);
      container.appendChild(form);
    }
  }, []);
  


  return (
    <div className="min-h-screen bg-gray-500">
      <Toaster position="top-center" reverseOrder={false} />

      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 py-4 shadow bg-white">
        <h1 className="text-xl font-bold text-blue-600">YouTube Comments Downloader</h1>

        {isAuthenticated ? (
          <div className="flex items-center gap-4">
            <p>Credits: {credits ?? 0}</p>
            <Avatar>
              <AvatarImage src={session.user.image || ""} alt="@user" />
              <AvatarFallback>{session.user.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{session.user.name}</span>
            <Button variant="destructive" onClick={() => signOut()}>
              Sign Out
            </Button>
          </div>
        ) : (
          <Button onClick={() => signIn("google")}>Sign in with Google</Button>
        )}
      </nav>

      {/* Main Section */}
      <main className="flex flex-col items-center px-4 py-12 space-y-12">
        <h2 className="text-3xl font-semibold text-center">Download Comments from a YouTube Video</h2>

        <div className="w-full max-w-xl space-y-6 bg-white p-6 rounded-lg shadow">
          <Input
            placeholder="Enter YouTube video URL..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            disabled={!isAuthenticated || (countdown !== null && countdown > 0)}
          />

          {/* Format Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                Format: {format.toUpperCase()}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full">
              {["csv", "html", "json", "txt"].map((f) => (
                <DropdownMenuItem key={f} onClick={() => setFormat(f)}>
                  {f.toUpperCase()}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={handleDownload}
            disabled={!isAuthenticated || !videoUrl || isLoading || (countdown !== null && countdown > 0)}
            className="w-full flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Fetching...
              </>
            ) : countdown !== null && countdown > 0 ? (
              `Preparing... ${countdown}s`
            ) : downloadReady ? (
              "Start Download"
            ) : (
              "Fetch Comments"
            )}
          </Button>
        </div>

        {/* Razorpay Buy Credits Section */}
        <div className="w-full max-w-xl bg-white p-6 rounded-lg shadow space-y-6">
          <h3 className="text-2xl font-semibold text-center">Buy Credits. The credits will reflect in 24 hours
            you can email me sujalsharma151@gmail.com for payment enquiries. Thank you for supporting me.
          </h3>
          <div id="razorpay-button-container" className="flex justify-center" />
        </div>

        {!isAuthenticated && (
          <p className="text-gray-500 mt-6 text-sm text-center">
            Please sign in to enable download and credit purchase functionality.
          </p>
        )}
              <Image 
        src="/diagram-export-4-28-2025-11_38_51-PM.png"
        alt="Diagram"
        width={1500}
        height={1500}
      />

      </main>

    </div>
  );
}
