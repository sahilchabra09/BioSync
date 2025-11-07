from __future__ import annotations

import asyncio
import base64
import json
import time
from typing import Dict

import cv2
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

try:
    from .engine_local import (
        CalibrationCaptureRequest,
        CalibrationFinalizeRequest,
        CalibrationStartRequest,
        EyeTracker,
        ParametersRequest,
        ROIRequest,
        StartRequest,
        get_preview_clients_lock,
        shutdown_tracker as _shutdown_tracker,
    )
except ImportError as exc:  # pragma: no cover - defensive
    raise ImportError(
        "eye_tracking.engine_local is missing. Copy the template to engine_local.py "
        "and keep it out of version control as requested."
    ) from exc

router = APIRouter()
tracker = EyeTracker()
_preview_clients: Dict[int, WebSocket] = {}


@router.get("/api/status")
def get_status():
    return {
        "running": tracker.is_running(),
        "source": tracker.source,
        "roi": tracker.crop_roi,
        "parameters": tracker.get_parameters(),
        "calibration_loaded": tracker.rbf_interpolator_x is not None,
    }


@router.post("/api/start")
def start_tracker(request: StartRequest):
    restart = False
    if tracker.is_running():
        if tracker.source == request.source:
            return {"status": "already-running", "source": request.source}
        tracker.stop()
        restart = True
    try:
        tracker.start(request.source)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"status": "restarted" if restart else "started", "source": request.source}


@router.post("/api/stop")
def stop_tracker():
    if not tracker.is_running():
        raise HTTPException(status_code=400, detail="Tracker is not running")
    tracker.stop()
    return {"status": "stopped"}


@router.get("/api/gaze")
def get_gaze_data():
    data = tracker.get_latest_data()
    if data is None:
        raise HTTPException(status_code=503, detail="No gaze data available")
    return data


@router.put("/api/roi")
def set_roi(request: ROIRequest):
    tracker.set_roi((request.x, request.y, request.width, request.height))
    return {"status": "roi-updated", "roi": tracker.crop_roi}


@router.delete("/api/roi")
def clear_roi():
    tracker.set_roi(None)
    return {"status": "roi-cleared"}


@router.put("/api/parameters")
def update_parameters(request: ParametersRequest):
    tracker.set_parameters(**request.dict(exclude_unset=True))
    return {"status": "parameters-updated", "parameters": tracker.get_parameters()}


@router.post("/api/calibration/start")
def calibration_start(request: CalibrationStartRequest):
    points = tracker.start_calibration(request.screen_width, request.screen_height)
    return {"status": "calibration-started", "points": points}


@router.post("/api/calibration/capture")
async def calibration_capture(request: CalibrationCaptureRequest):
    try:
        result = await asyncio.to_thread(
            tracker.capture_calibration_point, request.point_index, request.screen_x, request.screen_y
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"status": "calibration-point-captured", **result}


@router.post("/api/calibration/finish")
async def calibration_finish(request: CalibrationFinalizeRequest):
    try:
        result = await asyncio.to_thread(tracker.finalize_calibration, request.screen_width, request.screen_height)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"status": "calibration-complete", **result}


@router.get("/api/calibration/state")
def calibration_state():
    return {
        "active": tracker.calibration_active,
        "points_collected": len(tracker.calibration_samples),
    }


async def _publish_frame(websocket: WebSocket, frame_info: Dict[str, object]) -> None:
    frame = frame_info["frame"]
    success, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
    if not success:
        await asyncio.sleep(0.1)
        return

    payload = {
        "width": frame_info["width"],
        "height": frame_info["height"],
        "roi": frame_info["roi"],
        "timestamp": time.time(),
        "data": base64.b64encode(buffer).decode("ascii"),
        "pupil_mask": frame_info.get("pupil_mask"),
        "glint_mask": frame_info.get("glint_mask"),
    }
    await websocket.send_text(json.dumps(payload))


@router.websocket("/ws/preview")
async def preview_feed(websocket: WebSocket):
    await websocket.accept()
    client_id = id(websocket)
    async with get_preview_clients_lock():
        _preview_clients[client_id] = websocket
    try:
        while True:
            frame_info = tracker.get_preview_frame()
            if frame_info is None:
                await asyncio.sleep(0.1)
                continue
            await _publish_frame(websocket, frame_info)
            await asyncio.sleep(1 / 15)
    except WebSocketDisconnect:
        pass
    except Exception as exc:  # pragma: no cover - defensive logging
        print(f"Preview websocket error: {exc}")
    finally:
        async with get_preview_clients_lock():
            _preview_clients.pop(client_id, None)
        try:
            await websocket.close()
        except Exception:  # pragma: no cover - defensive
            pass


def shutdown_tracker() -> None:
    _shutdown_tracker(tracker)

