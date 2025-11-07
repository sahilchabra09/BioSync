"""Template for the eye-tracking engine implementation.

Copy this file to `engine_local.py` and replace the placeholder with the
proprietary eye-tracking logic. The `engine_local.py` file is .gitignored so
it can remain local.
"""

import typing as _t

from fastapi import WebSocket
from pydantic import BaseModel, Field


class StartRequest(BaseModel):
    source: str = Field("0", description="Video source index or path")


class ROIRequest(BaseModel):
    x: int
    y: int
    width: int
    height: int


class ParametersRequest(BaseModel):
    pupil_thresh: _t.Optional[int] = None
    pupil_blur: _t.Optional[int] = None
    glint_thresh: _t.Optional[int] = None
    glint_blur: _t.Optional[int] = None
    ray_history: _t.Optional[int] = None
    smoothing_factor: _t.Optional[float] = None
    sphere_radius: _t.Optional[int] = None


class CalibrationStartRequest(BaseModel):
    screen_width: int
    screen_height: int


class CalibrationCaptureRequest(BaseModel):
    point_index: int
    screen_x: int
    screen_y: int


class CalibrationFinalizeRequest(BaseModel):
    screen_width: int
    screen_height: int


class EyeTracker:
    """Minimal stub so imports succeed if the local implementation is missing."""

    def __init__(self, *args, **kwargs) -> None:  # pragma: no cover - placeholder
        raise RuntimeError(
            "eye_tracking.engine_local.EyeTracker is not implemented. Copy the template to "
            "engine_local.py and insert the real eye-tracking implementation."
        )

    # All methods below are placeholders that mirror the expected interface.
    def start(self, source: str = "0") -> None:
        raise NotImplementedError

    def stop(self) -> None:
        raise NotImplementedError

    def is_running(self) -> bool:
        return False

    def set_roi(self, roi: _t.Optional[_t.Tuple[int, int, int, int]]) -> None:
        raise NotImplementedError

    def set_parameters(self, **kwargs) -> None:
        raise NotImplementedError

    def get_parameters(self) -> dict:
        return {}

    def start_calibration(self, screen_w: int, screen_h: int):
        raise NotImplementedError

    def capture_calibration_point(self, *args, **kwargs):
        raise NotImplementedError

    def finalize_calibration(self, *args, **kwargs):
        raise NotImplementedError

    def get_latest_data(self):
        return None

    def get_preview_frame(self):
        return None


async def get_preview_clients_lock():  # pragma: no cover - placeholder
    raise RuntimeError(
        "eye_tracking.engine_local is required. Copy engine_template.py to engine_local.py."
    )


def shutdown_tracker(tracker: EyeTracker) -> None:  # pragma: no cover - placeholder
    pass
