use bytemuck::{Pod, Zeroable};
use wasm_bindgen::prelude::*;

pub const SHARED_STATE_BYTES: usize = 32;
pub const OFFSET_MOUSE_X: usize = 0;
pub const OFFSET_MOUSE_Y: usize = 4;
pub const OFFSET_SCROLL_VX: usize = 8;
pub const OFFSET_TILT_X: usize = 12;
pub const OFFSET_TILT_Y: usize = 16;
pub const OFFSET_TICK_TARGET: usize = 20;
pub const OFFSET_FRAME_COUNTER: usize = 24;
pub const OFFSET_PADDING: usize = 28;

#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
pub struct SharedState {
    pub mouse_x: f32,
    pub mouse_y: f32,
    pub scroll_vx: f32,
    pub tilt_x: f32,
    pub tilt_y: f32,
    pub tick_target: f32,
    pub frame_counter: u32,
    pub _padding: u32,
}

const _: [(); SHARED_STATE_BYTES] = [(); core::mem::size_of::<SharedState>()];
const _: [(); 4] = [(); core::mem::align_of::<SharedState>()];

pub fn read(buffer: &[u8]) -> Option<&SharedState> {
    bytemuck::try_from_bytes(buffer).ok()
}

pub fn write(buffer: &mut [u8]) -> Option<&mut SharedState> {
    bytemuck::try_from_bytes_mut(buffer).ok()
}

#[wasm_bindgen]
pub fn shared_state_bytes() -> usize {
    SHARED_STATE_BYTES
}

#[wasm_bindgen]
pub fn shared_state_offset(field: &str) -> Option<usize> {
    match field {
        "mouse_x" => Some(OFFSET_MOUSE_X),
        "mouse_y" => Some(OFFSET_MOUSE_Y),
        "scroll_vx" => Some(OFFSET_SCROLL_VX),
        "tilt_x" => Some(OFFSET_TILT_X),
        "tilt_y" => Some(OFFSET_TILT_Y),
        "tick_target" => Some(OFFSET_TICK_TARGET),
        "frame_counter" => Some(OFFSET_FRAME_COUNTER),
        "_padding" => Some(OFFSET_PADDING),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn layout_matches_js_wire_format() {
        assert_eq!(core::mem::size_of::<SharedState>(), SHARED_STATE_BYTES);
        assert_eq!(core::mem::align_of::<SharedState>(), 4);
        assert_eq!(core::mem::offset_of!(SharedState, mouse_x), OFFSET_MOUSE_X);
        assert_eq!(core::mem::offset_of!(SharedState, mouse_y), OFFSET_MOUSE_Y);
        assert_eq!(core::mem::offset_of!(SharedState, scroll_vx), OFFSET_SCROLL_VX);
        assert_eq!(core::mem::offset_of!(SharedState, tilt_x), OFFSET_TILT_X);
        assert_eq!(core::mem::offset_of!(SharedState, tilt_y), OFFSET_TILT_Y);
        assert_eq!(core::mem::offset_of!(SharedState, tick_target), OFFSET_TICK_TARGET);
        assert_eq!(
            core::mem::offset_of!(SharedState, frame_counter),
            OFFSET_FRAME_COUNTER
        );
        assert_eq!(core::mem::offset_of!(SharedState, _padding), OFFSET_PADDING);
    }

    #[test]
    fn reads_and_writes_exact_wire_buffer() {
        let mut bytes = [0_u8; SHARED_STATE_BYTES];
        let state = write(&mut bytes).expect("32-byte buffer should match SharedState");
        state.mouse_x = 12.0;
        state.frame_counter = 7;

        let state = read(&bytes).expect("32-byte buffer should match SharedState");
        assert_eq!(state.mouse_x, 12.0);
        assert_eq!(state.frame_counter, 7);
        assert!(read(&bytes[..SHARED_STATE_BYTES - 1]).is_none());
    }
}
