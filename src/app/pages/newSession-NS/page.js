"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQRCode } from "next-qrcode";

import "./newSession.css";

import Header from "@/app/components/Header/Header";

const QRCode = ({ url }) => {
    const { SVG } = useQRCode();
    return (
        <SVG
            text={url}
            options={{
                margin: 2,
                width: 200,
                color: {
                    dark: "#000000FF",
                    light: "#FFFFFFFF",
                },
            }}
        />
    );
};

export function NewSessionContent() {
    const router = useRouter();
    const [sessionID, setSessionID] = useState("");

    // URL param fetching
    const searchParams = useSearchParams();
    // const userID = searchParams.get("userID");
    const sessionIDParam = searchParams.get("sessionID");

    // Initialize sessionID on client side to avoid hydration mismatch
    useEffect(() => {
        if (sessionIDParam) {
            setSessionID(sessionIDParam);
        } else {
            const randomSessionID = Math.random().toString(36).substring(2, 15);
            setSessionID(randomSessionID);
            router.push(`/pages/newSession-NS?sessionID=${randomSessionID}`);
        }
    }, [sessionIDParam, router]);

    // Don't render until sessionID is available to avoid hydration mismatch
    if (!sessionID) {
        return (
            <div className="new-session-container">
                <div className="new-session">
                    <Header title="Neuroserpin" />
                    <div className="page-container">
                        <div className="instructions-container">
                            <h2>Loading...</h2>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // URL construction
    const productionBaseURL = "https://neuroserpin-v0.vercel.app/pages/activity-1?flowId=682f33b87a6b41356cee7202";
    const developmentBaseURL = "http://localhost:3000/pages/activity-1?flowId=682f33b87a6b41356cee7202";
    const isDev = process.env.NODE_ENV === 'development';
    let baseURL = isDev ? developmentBaseURL : productionBaseURL;
    const fullURL = `${baseURL}&sessionID=${sessionID}`;

    // On Start button handler
    const onStartActivity = () => {
        console.log("Starting activity");
        router.push(fullURL);
    };
    // const onSkipToResults = () => {
    //     console.log("Skipping to results");
    //     router.push(`/pages/review?sessionID=${sessionID}`);
    // };

    return (
        <div className="new-session-container">
            <div className="new-session">
                <Header title="Neuroserpin" />

                <div className="page-container">


                    <div className="instructions-container">
                        {/* <h1>JOIN THE WHITEBOARD EXERCISE</h1>
                        <h1>FOR A GROUP EXPERIENCE!</h1> */}
                    </div>

                    <div className="new-session-body-footer-container">
                        <div className="new-session-body">
                            <div className="new-session-body-qr-code">
                                <QRCode url={fullURL} />
                            </div>
                            <div className="or-container">
                                <h3>OR</h3>
                            </div>
                            <div className="link-container">
                                <a href={fullURL}>{fullURL}</a>
                                <button
                                    className="copy-link-button"
                                    onClick={() =>
                                        navigator.clipboard.writeText(fullURL)
                                    }
                                >
                                    Copy Link
                                </button>
                            </div>
                        </div>
                        <div className="new-session-footer">
                            {/* <button
                                className="dark-button"
                                onClick={onSkipToResults}
                            >
                                SKIP TO RESULTS
                            </button> */}
                            <button
                                className="dark-button"
                                onClick={onStartActivity}
                            >
                                START ACTIVITY
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function NewSession() {
    return (
        <Suspense
            fallback={
                <div className="full-page">
                    <h2>Loading...</h2>
                </div>
            }
        >
            {/* Actual content */}
            <NewSessionContent />
        </Suspense>
    );
}
