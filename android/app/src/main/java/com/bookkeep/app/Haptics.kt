package com.bookkeep.app

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.view.HapticFeedbackConstants
import android.view.View
import android.webkit.JavascriptInterface

/**
 * Called from the page as window.Haptics.tick(kind). kind: "tick", "confirm" or "error".
 * Phones with advanced haptics get the system haptic effects.
 * Phones without them get a very short, low-strength vibration.
 * Both respect the phone's "touch feedback / vibration" setting.
 */
class Haptics(private val view: View) {

    private val vibrator: Vibrator? =
        if (Build.VERSION.SDK_INT >= 31) {
            (view.context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            view.context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }

    private val richHaptics: Boolean =
        Build.VERSION.SDK_INT >= 30 &&
            vibrator?.areAllPrimitivesSupported(
                VibrationEffect.Composition.PRIMITIVE_CLICK,
                VibrationEffect.Composition.PRIMITIVE_TICK
            ) == true

    @JavascriptInterface
    fun tick(kind: String) {
        view.post { play(kind) }
    }

    private fun enabledBySystem(): Boolean =
        Settings.System.getInt(view.context.contentResolver, Settings.System.HAPTIC_FEEDBACK_ENABLED, 1) == 1

    private fun play(kind: String) {
        if (!enabledBySystem()) return
        if (Build.VERSION.SDK_INT >= 30 && richHaptics) {
            val effect = when (kind) {
                "confirm" -> HapticFeedbackConstants.CONFIRM
                "error" -> HapticFeedbackConstants.REJECT
                else -> HapticFeedbackConstants.CLOCK_TICK
            }
            view.performHapticFeedback(effect)
        } else {
            smallBuzz(if (kind == "tick") 8L else 20L)
        }
    }

    private fun smallBuzz(ms: Long) {
        val v = vibrator ?: return
        if (!v.hasVibrator()) return
        val amplitude = if (v.hasAmplitudeControl()) 50 else VibrationEffect.DEFAULT_AMPLITUDE
        v.vibrate(VibrationEffect.createOneShot(ms, amplitude))
    }
}
