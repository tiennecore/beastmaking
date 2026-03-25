package com.tiennecore.beastmaking

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class TimerModule : Module() {
    private var pauseReceiver: BroadcastReceiver? = null

    override fun definition() = ModuleDefinition {
        Name("TimerNativeModule")
        Events("TimerPausePressed")

        OnCreate { registerPauseReceiver() }
        OnDestroy { unregisterPauseReceiver() }

        Function("startService") { phase: String, time: String, color: String ->
            val context = appContext.reactContext ?: return@Function
            val intent = Intent(context, TimerForegroundService::class.java).apply {
                putExtra(TimerForegroundService.EXTRA_PHASE, phase)
                putExtra(TimerForegroundService.EXTRA_TIME, time)
                putExtra(TimerForegroundService.EXTRA_COLOR, color)
                putExtra(TimerForegroundService.EXTRA_PAUSED, false)
            }
            context.startForegroundService(intent)
        }

        Function("updateNotification") { phase: String, time: String, color: String, isPaused: Boolean ->
            val context = appContext.reactContext ?: return@Function
            val intent = Intent(context, TimerForegroundService::class.java).apply {
                action = TimerForegroundService.ACTION_UPDATE
                putExtra(TimerForegroundService.EXTRA_PHASE, phase)
                putExtra(TimerForegroundService.EXTRA_TIME, time)
                putExtra(TimerForegroundService.EXTRA_COLOR, color)
                putExtra(TimerForegroundService.EXTRA_PAUSED, isPaused)
            }
            context.startService(intent)
        }

        Function("stopService") {
            val context = appContext.reactContext ?: return@Function
            val intent = Intent(context, TimerForegroundService::class.java).apply {
                action = TimerForegroundService.ACTION_STOP
            }
            context.startService(intent)
        }

        Function("playBeep") { type: String ->
            val context = appContext.reactContext ?: return@Function
            val intent = Intent(context, TimerForegroundService::class.java).apply {
                action = TimerForegroundService.ACTION_PLAY_BEEP
                putExtra(TimerForegroundService.EXTRA_BEEP_TYPE, type)
            }
            context.startService(intent)
        }
    }

    private fun registerPauseReceiver() {
        val context = appContext.reactContext ?: return
        pauseReceiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context?, intent: Intent?) {
                sendEvent("TimerPausePressed", mapOf<String, Any>())
            }
        }
        val filter = IntentFilter("com.tiennecore.beastmaking.PAUSE_PRESSED")
        try {
            ContextCompat.registerReceiver(
                context,
                pauseReceiver,
                filter,
                ContextCompat.RECEIVER_NOT_EXPORTED
            )
        } catch (_: Exception) {}
    }

    private fun unregisterPauseReceiver() {
        val context = appContext.reactContext ?: return
        try {
            pauseReceiver?.let { context.unregisterReceiver(it) }
        } catch (_: Exception) {}
        pauseReceiver = null
    }
}
