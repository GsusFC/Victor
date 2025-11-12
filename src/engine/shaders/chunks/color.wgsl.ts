/**
 * Color manipulation functions for WGSL shaders
 * @license MIT
 */

export const colorChunk = /* wgsl */ `
// RGB to HSV conversion
fn rgb_to_hsv(rgb: vec3f) -> vec3f {
  let max_val = max(max(rgb.r, rgb.g), rgb.b);
  let min_val = min(min(rgb.r, rgb.g), rgb.b);
  let delta = max_val - min_val;

  var h = 0.0;
  var s = 0.0;
  let v = max_val;

  if (delta > EPSILON) {
    s = delta / max_val;

    if (rgb.r >= max_val) {
      h = (rgb.g - rgb.b) / delta;
    } else if (rgb.g >= max_val) {
      h = 2.0 + (rgb.b - rgb.r) / delta;
    } else {
      h = 4.0 + (rgb.r - rgb.g) / delta;
    }

    h = h / 6.0;
    if (h < 0.0) { h = h + 1.0; }
  }

  return vec3f(h, s, v);
}

// HSV to RGB conversion
fn hsv_to_rgb(hsv: vec3f) -> vec3f {
  let h = hsv.x * 6.0;
  let s = hsv.y;
  let v = hsv.z;

  let i = floor(h);
  let f = h - i;

  let p = v * (1.0 - s);
  let q = v * (1.0 - s * f);
  let t = v * (1.0 - s * (1.0 - f));

  let i_mod = i32(i) % 6;

  if (i_mod == 0) { return vec3f(v, t, p); }
  else if (i_mod == 1) { return vec3f(q, v, p); }
  else if (i_mod == 2) { return vec3f(p, v, t); }
  else if (i_mod == 3) { return vec3f(p, q, v); }
  else if (i_mod == 4) { return vec3f(t, p, v); }
  else { return vec3f(v, p, q); }
}

// RGB to HSL conversion
fn rgb_to_hsl(rgb: vec3f) -> vec3f {
  let max_val = max(max(rgb.r, rgb.g), rgb.b);
  let min_val = min(min(rgb.r, rgb.g), rgb.b);
  let delta = max_val - min_val;

  var h = 0.0;
  var s = 0.0;
  let l = (max_val + min_val) * 0.5;

  if (delta > EPSILON) {
    s = select(
      delta / (2.0 - max_val - min_val),
      delta / (max_val + min_val),
      l < 0.5
    );

    if (rgb.r >= max_val) {
      h = (rgb.g - rgb.b) / delta;
    } else if (rgb.g >= max_val) {
      h = 2.0 + (rgb.b - rgb.r) / delta;
    } else {
      h = 4.0 + (rgb.r - rgb.g) / delta;
    }

    h = h / 6.0;
    if (h < 0.0) { h = h + 1.0; }
  }

  return vec3f(h, s, l);
}

// HSL to RGB conversion
fn hsl_to_rgb(hsl: vec3f) -> vec3f {
  let h = hsl.x;
  let s = hsl.y;
  let l = hsl.z;

  let c = (1.0 - abs(2.0 * l - 1.0)) * s;
  let x = c * (1.0 - abs((h * 6.0) % 2.0 - 1.0));
  let m = l - c * 0.5;

  var rgb = vec3f(0.0);

  let h6 = h * 6.0;
  if (h6 < 1.0) { rgb = vec3f(c, x, 0.0); }
  else if (h6 < 2.0) { rgb = vec3f(x, c, 0.0); }
  else if (h6 < 3.0) { rgb = vec3f(0.0, c, x); }
  else if (h6 < 4.0) { rgb = vec3f(0.0, x, c); }
  else if (h6 < 5.0) { rgb = vec3f(x, 0.0, c); }
  else { rgb = vec3f(c, 0.0, x); }

  return rgb + m;
}

// Luminance calculation (perceptual)
fn luminance(rgb: vec3f) -> f32 {
  return dot(rgb, vec3f(0.299, 0.587, 0.114));
}

// Linear to sRGB gamma correction
fn linear_to_srgb(linear: vec3f) -> vec3f {
  return select(
    1.055 * pow(linear, vec3f(1.0 / 2.4)) - 0.055,
    linear * 12.92,
    linear <= vec3f(0.0031308)
  );
}

// sRGB to linear conversion
fn srgb_to_linear(srgb: vec3f) -> vec3f {
  return select(
    pow((srgb + 0.055) / 1.055, vec3f(2.4)),
    srgb / 12.92,
    srgb <= vec3f(0.04045)
  );
}

// Color temperature to RGB (approximate)
fn temperature_to_rgb(temp: f32) -> vec3f {
  // Temperature in Kelvin (1000-40000)
  let t = clamp(temp, 1000.0, 40000.0) / 100.0;

  var r: f32;
  var g: f32;
  var b: f32;

  // Red
  if (t <= 66.0) {
    r = 1.0;
  } else {
    r = 1.292936186 * pow(t - 60.0, -0.1332047592);
    r = clamp(r, 0.0, 1.0);
  }

  // Green
  if (t <= 66.0) {
    g = 0.39008157876 * log(t) - 0.631841444;
  } else {
    g = 1.129890861 * pow(t - 60.0, -0.0755148492);
  }
  g = clamp(g, 0.0, 1.0);

  // Blue
  if (t >= 66.0) {
    b = 1.0;
  } else if (t <= 19.0) {
    b = 0.0;
  } else {
    b = 0.543206789 * log(t - 10.0) - 1.196254089;
    b = clamp(b, 0.0, 1.0);
  }

  return vec3f(r, g, b);
}

// Vibrance adjustment (selective saturation)
fn vibrance(rgb: vec3f, amount: f32) -> vec3f {
  let avg = (rgb.r + rgb.g + rgb.b) / 3.0;
  let max_val = max(max(rgb.r, rgb.g), rgb.b);
  let sat = max_val - avg;

  let boost = sat * amount;
  return mix(vec3f(avg), rgb, 1.0 + boost);
}

// Color grading - lift, gamma, gain
fn color_grade(rgb: vec3f, lift: vec3f, gamma: vec3f, gain: vec3f) -> vec3f {
  let lifted = rgb + lift;
  let gained = lifted * gain;
  return pow(gained, 1.0 / gamma);
}
`;
