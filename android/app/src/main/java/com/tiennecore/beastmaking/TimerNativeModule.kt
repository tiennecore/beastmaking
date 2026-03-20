package com.tiennecore.beastmaking

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class TimerNativeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "TimerNativeModule"

    private var pauseReceiver: BroadcastReceiver? = null

    override fun initialize() {
        super.initialize()
        pauseReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                try {
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("TimerPausePressed", null)
                } catch (_: Exception) {}
            }
        }
        val filter = IntentFilter("com.tiennecore.beastmaking.PAUSE_PRESSED")
        try {
            ContextCompat.registerReceiver(
                reactContext,
                pauseReceiver,
                filter,
                ContextCompat.RECEIVER_NOT_EXPORTED
            )
        } catch (_: Exception) {}
    }

    override fun invalidate() {
        try {
            pauseReceiver?.let { reactContext.unregisterReceiver(it) }
        } catch (_: Exception) {}
        pauseReceiver = null
        super.invalidate()
    }

    @ReactMethod
    fun startService(phase: String, time: String, color: String) {
        val intent = Intent(reactContext, TimerForegroundService::class.java).apply {
            putExtra(TimerForegroundService.EXTRA_PHASE, phase)
            putExtra(TimerForegroundService.EXTRA_TIME, time)
            putExtra(TimerForegroundService.EXTRA_COLOR, color)
            putExtra(TimerForegroundService.EXTRA_PAUSED, false)
        }
        reactContext.startForegroundService(intent)
    }

    @ReactMethod
    fun updateNotification(phase: String, time: String, color: String, isPaused: Boolean) {
        val intent = Intent(reactContext, TimerForegroundService::class.java).apply {
            action = TimerForegroundService.ACTION_UPDATE
            putExtra(TimerForegroundService.EXTRA_PHASE, phase)
            putExtra(TimerForegroundService.EXTRA_TIME, time)
            putExtra(TimerForegroundService.EXTRA_COLOR, color)
            putExtra(TimerForegroundService.EXTRA_PAUSED, isPaused)
        }
        reactContext.startService(intent)
    }

    @ReactMethod
    fun stopService() {
        val intent = Intent(reactContext, TimerForegroundService::class.java).apply {
            action = TimerForegroundService.ACTION_STOP
        }
        reactContext.startService(intent)
    }

    @ReactMethod
    fun playBeep(type: String) {
        val intent = Intent(reactContext, TimerForegroundService::class.java).apply {
            action = TimerForegroundService.ACTION_PLAY_BEEP
            putExtra(TimerForegroundService.EXTRA_BEEP_TYPE, type)
        }
        reactContext.startService(intent)
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
