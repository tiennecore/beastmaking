package com.tiennecore.beastmaking

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.media.AudioAttributes
import android.media.SoundPool
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class TimerForegroundService : Service() {

    companion object {
        const val CHANNEL_ID = "beastmaking_timer"
        const val NOTIFICATION_ID = 1001

        const val ACTION_UPDATE = "com.tiennecore.beastmaking.UPDATE"
        const val ACTION_STOP = "com.tiennecore.beastmaking.STOP"
        const val ACTION_PAUSE = "com.tiennecore.beastmaking.PAUSE"
        const val ACTION_PLAY_BEEP = "com.tiennecore.beastmaking.PLAY_BEEP"

        const val EXTRA_PHASE = "phase"
        const val EXTRA_TIME = "time"
        const val EXTRA_COLOR = "color"
        const val EXTRA_PAUSED = "paused"
        const val EXTRA_BEEP_TYPE = "beep_type"
    }

    private var soundPool: SoundPool? = null
    private var shortBeepId: Int = 0
    private var longBeepId: Int = 0

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        initSoundPool()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    stopForeground(STOP_FOREGROUND_REMOVE)
                } else {
                    @Suppress("DEPRECATION")
                    stopForeground(true)
                }
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_PAUSE -> {
                val broadcastIntent = Intent("com.tiennecore.beastmaking.PAUSE_PRESSED")
                sendBroadcast(broadcastIntent)
                return START_STICKY
            }
            ACTION_PLAY_BEEP -> {
                val type = intent.getStringExtra(EXTRA_BEEP_TYPE) ?: "short"
                playBeep(type)
                return START_STICKY
            }
            else -> {
                val phase = intent?.getStringExtra(EXTRA_PHASE) ?: "Timer"
                val time = intent?.getStringExtra(EXTRA_TIME) ?: ""
                val color = intent?.getStringExtra(EXTRA_COLOR) ?: "#22C55E"
                val isPaused = intent?.getBooleanExtra(EXTRA_PAUSED, false) ?: false

                val notification = buildNotification(phase, time, color, isPaused)
                startForeground(NOTIFICATION_ID, notification)
                return START_STICKY
            }
        }
    }

    override fun onDestroy() {
        soundPool?.release()
        soundPool = null
        super.onDestroy()
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Timer actif",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Notification du timer pendant l'entraînement"
            setShowBadge(false)
            enableVibration(false)
            setSound(null, null)
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        }
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(channel)
    }

    private fun buildNotification(
        phase: String,
        time: String,
        color: String,
        isPaused: Boolean
    ): Notification {
        val openIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val openPending = PendingIntent.getActivity(
            this, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val pauseIntent = Intent(this, TimerForegroundService::class.java).apply {
            action = ACTION_PAUSE
        }
        val pausePending = PendingIntent.getService(
            this, 1, pauseIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val pauseLabel = if (isPaused) "▶ Reprendre" else "⏸ Pause"
        val title = if (isPaused) "⏸ En pause" else phase
        val parsedColor = try { Color.parseColor(color) } catch (_: Exception) { Color.GREEN }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(time)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setColor(parsedColor)
            .setColorized(true)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setContentIntent(openPending)
            .addAction(0, pauseLabel, pausePending)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()
    }

    private fun initSoundPool() {
        val attrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()

        soundPool = SoundPool.Builder()
            .setMaxStreams(3)
            .setAudioAttributes(attrs)
            .build()

        shortBeepId = soundPool!!.load(this, R.raw.beep_short, 1)
        longBeepId = soundPool!!.load(this, R.raw.beep_long, 1)
    }

    private fun playBeep(type: String) {
        val id = if (type == "long") longBeepId else shortBeepId
        soundPool?.play(id, 1.0f, 1.0f, 1, 0, 1.0f)
    }
}
