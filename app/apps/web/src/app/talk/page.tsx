"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Loader2, Mic } from "lucide-react";

import ContactGrid from "@/components/contact-grid";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { useMe } from "@/lib/hooks";

interface UserProfile {
	isParalyzed: boolean;
}

export default function TalkPage() {
	const { data: user, isLoading, error } = useMe();
	const isParalyzedUser = Boolean(
		(user as UserProfile | undefined)?.isParalyzed ?? (user as any)?.is_paralysed
	);

	if (isLoading) {
		return (
			<div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-gray-950">
				<Loader2 className="w-10 h-10 animate-spin text-blue-500" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-gray-950">
				<div className="text-center space-y-2">
					<p className="text-red-500 font-medium">Unable to load your profile</p>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						{error instanceof Error ? error.message : "Unknown error"}
					</p>
				</div>
			</div>
		);
	}

	if (isParalyzedUser) {
		return <ParalyzedTalkView />;
	}

	return <VoiceTranscriptionView />;
}

function ParalyzedTalkView() {
	return (
		<ContactGrid
			contacts={[]}
			showConnectionStatus={false}
			showNextTile={false}
			emptyLabel=""
		/>
	);
}

function VoiceTranscriptionView() {
	const [isRecording, setIsRecording] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [transcriptions, setTranscriptions] = useState<
		Array<{ id: string; text: string; timestamp: string }>
	>([]);

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const shouldUploadRef = useRef(true);

	const supportsMediaRecorder =
		typeof window !== "undefined" && "MediaRecorder" in window;

	const cleanupStream = () => {
		if (mediaStreamRef.current) {
			mediaStreamRef.current.getTracks().forEach((track) => track.stop());
			mediaStreamRef.current = null;
		}
	};

	const sendAudioForTranscription = async (blob: Blob) => {
		if (blob.size === 0) {
			setError("No audio captured. Please try again.");
			return;
		}

		setIsUploading(true);

		try {
			const audioFile = new File([blob], `recording-${Date.now()}.webm`, {
				type: blob.type || "audio/webm",
			});

			const response = await api.transcribeAudio(audioFile);
			const data = response.data;
			const text =
				typeof data === "string"
					? data
					: data?.text ?? data?.transcription ?? "";

			const trimmed = text?.trim();

			if (!trimmed) {
				setError("We could not detect any speech. Please try again.");
				return;
			}

			setError(null);
			setTranscriptions((prev) => [
				{
					id: `${Date.now()}`,
					text: trimmed,
					timestamp: new Date().toISOString(),
				},
				...prev,
			]);
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: "Unable to transcribe audio right now.";
			setError(message);
		} finally {
			setIsUploading(false);
		}
	};

	const startRecording = async () => {
		if (isRecording || isUploading) return;

		if (!supportsMediaRecorder || typeof navigator === "undefined") {
			setError("Recording is not supported in this browser.");
			return;
		}

		if (!navigator.mediaDevices?.getUserMedia) {
			setError("Microphone access is unavailable on this device.");
			return;
		}

		setError(null);

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			mediaStreamRef.current = stream;

			const options: MediaRecorderOptions = {};
			if (typeof MediaRecorder !== "undefined" && "isTypeSupported" in MediaRecorder) {
				if (MediaRecorder.isTypeSupported("audio/webm")) {
					options.mimeType = "audio/webm";
				}
			}

			const recorder = new MediaRecorder(stream, options);
			mediaRecorderRef.current = recorder;
			chunksRef.current = [];
			shouldUploadRef.current = true;

			recorder.ondataavailable = (event) => {
				if (event.data && event.data.size > 0) {
					chunksRef.current.push(event.data);
				}
			};

			recorder.onstop = async () => {
				cleanupStream();
				const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
				chunksRef.current = [];

				if (!shouldUploadRef.current) {
					return;
				}

				await sendAudioForTranscription(blob);
			};

			recorder.start();
			setIsRecording(true);
		} catch (err) {
			cleanupStream();
			const message =
				err instanceof Error
					? err.message
					: "Microphone access was denied.";
			setError(message);
			setIsRecording(false);
			mediaRecorderRef.current = null;
		}
	};

	const stopRecording = (upload = true) => {
		shouldUploadRef.current = upload;

		const recorder = mediaRecorderRef.current;
		if (!recorder) {
			cleanupStream();
			return;
		}

		if (recorder.state !== "inactive") {
			setIsRecording(false);
			recorder.stop();
		}

		mediaRecorderRef.current = null;
	};

	useEffect(() => {
		return () => {
			shouldUploadRef.current = false;
			stopRecording(false);
			cleanupStream();
		};
	}, []);

	const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
		if (event.button !== 0) return;
		event.preventDefault();
		startRecording();
	};

	const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
		event.preventDefault();
		stopRecording(true);
	};

	const handlePointerLeave = (event: PointerEvent<HTMLButtonElement>) => {
		if (event.buttons === 0) return;
		event.preventDefault();
		stopRecording(true);
	};

	const handlePointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
		event.preventDefault();
		stopRecording(false);
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (event.repeat) return;
		if (event.key === " " || event.key === "Enter") {
			event.preventDefault();
			startRecording();
		}
	};

	const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (event.key === " " || event.key === "Enter") {
			event.preventDefault();
			stopRecording(true);
		}
	};

	if (!supportsMediaRecorder) {
		return (
			<div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-gray-950 px-4">
				<div className="text-center space-y-2 max-w-md">
					<p className="text-lg font-semibold text-gray-900 dark:text-white">
						Audio recording is not supported on this device.
					</p>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						Please switch to a modern browser that supports the MediaRecorder API.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-gray-950 px-4 py-10">
			<div className="w-full max-w-3xl flex flex-col items-center gap-10">
				<div className="text-center space-y-2">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
						Hold to talk
					</h1>
					<p className="text-sm text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
						Hold the button to start recording your voice. Release it to send the audio for transcription and see the result instantly.
					</p>
				</div>

				<div className="flex flex-col items-center gap-6">
					<Button
						type="button"
						variant="secondary"
						className={`h-28 w-28 rounded-full text-base font-semibold shadow-lg transition-all duration-200 ${
							isRecording ? "bg-red-600 text-white scale-105" : "bg-blue-600 text-white hover:scale-105"
						} ${isUploading ? "opacity-70" : ""}`}
						disabled={isUploading}
						onPointerDown={handlePointerDown}
						onPointerUp={handlePointerUp}
						onPointerLeave={handlePointerLeave}
						onPointerCancel={handlePointerCancel}
						onKeyDown={handleKeyDown}
						onKeyUp={handleKeyUp}
						aria-pressed={isRecording}
					>
						{/* Capture audio while the press is held down */}
						<div className="flex flex-col items-center gap-2">
							<Mic className={`w-8 h-8 ${isRecording ? "animate-pulse" : ""}`} />
							<span>{isRecording ? "Recording..." : "Hold to record"}</span>
						</div>
					</Button>

					<p className="text-xs text-gray-500 dark:text-gray-500">
						Release the button to transcribe your speech.
					</p>

					{(isRecording || isUploading) && (
						<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
							<Loader2 className="w-4 h-4 animate-spin" />
							<span>{isRecording ? "Listening..." : "Sending audio for transcription..."}</span>
						</div>
					)}

					{error && (
						<div className="text-sm text-red-500 max-w-md text-center">{error}</div>
					)}
				</div>

				{transcriptions.length > 0 && (
					<div className="w-full max-w-2xl space-y-4">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
							Recent transcriptions
						</h2>
						<div className="space-y-3 max-h-64 overflow-y-auto pr-1">
							{transcriptions.map((item) => (
								<div
									key={item.id}
									className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-white dark:bg-gray-900 shadow-sm"
								>
									<p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
										{new Date(item.timestamp).toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</p>
									<p className="text-base text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
										{item.text}
									</p>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
