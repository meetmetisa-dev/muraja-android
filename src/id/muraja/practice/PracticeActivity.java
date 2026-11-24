package id.muraja.practice;

import android.app.Activity;
import android.Manifest;
import android.os.Handler;
import android.os.Looper;
import android.content.pm.PackageManager;
import android.speech.RecognitionListener;
import android.speech.SpeechRecognizer;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognizerIntent;

import android.webkit.*;
import org.json.JSONObject;
import org.json.JSONArray;
import java.util.ArrayList;

public class PracticeActivity extends Activity {
    private WebView page;
    private String pendingKey;
    private SpeechRecognizer recognizer;
    private final Handler callbacks = new Handler(Looper.getMainLooper());
    private boolean finishing;
    private int busyRetries;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);

        page = new WebView(this);
        setContentView(page);
        page.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        page.getSettings().setJavaScriptEnabled(true);
        page.getSettings().setDomStorageEnabled(true);
        page.getSettings().setAllowContentAccess(false);
        page.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return true; }
        });
        page.addJavascriptInterface(this, "Practice");
        page.loadUrl("file:///android_asset/index.html");
    }
    @JavascriptInterface public String chapters() {
        try (java.io.InputStream input = getAssets().open("quran.json");
             java.io.ByteArrayOutputStream bytes = new java.io.ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) bytes.write(buffer, 0, count);
            return bytes.toString("UTF-8");
        } catch (java.io.IOException ex) { return "[]"; }
    }
    @JavascriptInterface public void listen(String key) {
        runOnUiThread(() -> {
            if (pendingKey != null) return;
            pendingKey = key;
            finishing = false;
            busyRetries = 0;
            if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                startVoice();
            } else {
                requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, 7);
            }
        });
    }

    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        if (code != 7 || pendingKey == null) return;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) startVoice();
        else endSession("Microphone access is off. Open Settings → Apps → Muraja Voice → Permissions → Microphone.");
    }

    private void startVoice() {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            endSession("No speech service is available. Enable an Android speech recognition service and try again.");
            return;
        }
        try {
            recognizer = SpeechRecognizer.createSpeechRecognizer(this);
            final SpeechRecognizer session = recognizer;
            session.setRecognitionListener(new RecognitionListener() {
                public void onReadyForSpeech(Bundle params) {
                    if (recognizer == session) send("status", "Listening…");
                }
                public void onEndOfSpeech() {
                    callbacks.postDelayed(() -> {
                        if (recognizer != session || finishing) return;
                        restart(150);
                        send("status", "No final transcript arrived. Repeat the current ayah.");
                    }, 6000);
                }
                public void onError(int code) {
                    if (recognizer != session) return;
                    if (finishing) { endSession("Finished."); return; }
                    if (code == SpeechRecognizer.ERROR_NO_MATCH || code == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) {
                        restart(250);
                    } else if (code == SpeechRecognizer.ERROR_RECOGNIZER_BUSY && ++busyRetries <= 3) {
                        restart(300L * busyRetries);
                    } else endSession(errorMessage(code));
                }
                public void onResults(Bundle results) {
                    if (recognizer != session) return;
                    deliver("final", results);
                    busyRetries = 0;
                    if (finishing) endSession("Finished.");
                    else restart(120);
                }
                public void onBeginningOfSpeech() {}
                public void onRmsChanged(float rms) {}
                public void onBufferReceived(byte[] buffer) {}
                public void onPartialResults(Bundle results) { if (recognizer == session) deliver("partial", results); }
                public void onEvent(int type, Bundle params) {}
            });
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ar-SA");
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
            session.startListening(intent);
        } catch (RuntimeException ex) {
            endSession("The speech service could not start. Check your selected speech service and microphone permission.");
        }
    }

    private String errorMessage(int code) {
        switch (code) {
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: return "Microphone access was denied. Check microphone permissions for Muraja Voice and your speech service.";
            case SpeechRecognizer.ERROR_AUDIO: return "The microphone could not capture audio. Check that microphone access is on.";
            case SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED: return "Your selected speech service does not support the requested Arabic language.";
            case SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE: return "Arabic recognition is unavailable. Check your speech service’s Arabic language downloads.";
            case SpeechRecognizer.ERROR_NETWORK:
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT: return "The speech service reported a network problem. Check your connection and retry.";
            case SpeechRecognizer.ERROR_NO_MATCH:
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT: return "No Arabic words were recognized. Tap Recite and speak after Listening appears.";
            default: return "The speech service could not finish (error " + code + "). Please retry.";
        }
    }

    private void deliver(String type, Bundle result) {
        ArrayList<String> words = result == null ? null : result.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (words != null && !words.isEmpty()) dispatch(type, new JSONArray(words).toString());
        else if ("final".equals(type)) send("reset", "");
    }

    private void send(String type, String value) {
        dispatch(type, JSONObject.quote(value));
    }

    private void dispatch(String type, String jsonValue) {
        if (pendingKey == null) return;
        String args = JSONObject.quote(pendingKey) + "," + JSONObject.quote(type) + "," + jsonValue;
        page.evaluateJavascript("window.voiceEvent && voiceEvent(" + args + ")", null);
    }

    private void releaseRecognizer() {
        SpeechRecognizer old = recognizer;
        recognizer = null;
        if (old != null) old.destroy();
    }

    private void restart(long delay) {
        releaseRecognizer();
        send("reset", "");
        callbacks.postDelayed(() -> { if (pendingKey != null && !finishing) startVoice(); }, delay);
    }

    @JavascriptInterface public void finish(String key) {
        runOnUiThread(() -> {
            if (!key.equals(pendingKey) || finishing) return;
            finishing = true;
            if (recognizer == null) { endSession("Finished."); return; }
            recognizer.stopListening();
            callbacks.postDelayed(() -> endSession("Finished."), 3000);
        });
    }

    @JavascriptInterface public void cancel(String key) {
        runOnUiThread(() -> { if (key.equals(pendingKey)) endSession("Stopped."); });
    }

    private void endSession(String message) {
        send("end", message);
        pendingKey = null;
        finishing = false;
        callbacks.removeCallbacksAndMessages(null);
        releaseRecognizer();
    }
    @Override protected void onStop() {
        if (recognizer != null || pendingKey != null && checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED)
            endSession("Recording stopped.");
        super.onStop();
    }
    @Override protected void onDestroy() {
        endSession("Stopped.");
        super.onDestroy();
    }
}
