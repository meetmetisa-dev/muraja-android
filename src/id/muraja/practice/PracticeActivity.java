package id.muraja.practice;

import android.app.Activity;
import android.Manifest;
import android.app.AlertDialog;
import android.content.pm.PackageManager;
import android.speech.RecognitionListener;
import android.speech.SpeechRecognizer;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognizerIntent;

import android.webkit.*;
import org.json.JSONObject;
import java.util.ArrayList;

public class PracticeActivity extends Activity {
    private WebView page;
    private String pendingKey;
    private SpeechRecognizer recognizer;
    private AlertDialog recording;
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
        else finishVoice("", "Microphone access is off. Open Settings → Apps → Muraja Voice → Permissions → Microphone.");
    }

    private void startVoice() {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            finishVoice("", "No speech service is available. Enable an Android speech recognition service and try again.");
            return;
        }
        try {
            recognizer = SpeechRecognizer.createSpeechRecognizer(this);
            final SpeechRecognizer session = recognizer;
            recording = new AlertDialog.Builder(this).setTitle("Recite in Arabic")
                .setMessage("Starting microphone…")
                .setNegativeButton("Cancel", (dialog, which) -> finishVoice("", "Recording cancelled."))
                .setPositiveButton("Finish", null).create();
            recording.setOnCancelListener(dialog -> finishVoice("", "Recording cancelled."));
            recording.show();
            recording.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(view -> {
                session.stopListening();
                view.setEnabled(false);
                recording.setMessage("Checking your words…");
            });
            session.setRecognitionListener(new RecognitionListener() {
                public void onReadyForSpeech(Bundle params) { if (recognizer == session) recording.setMessage("Listening. Recite the selected ayah."); }
                public void onEndOfSpeech() { if (recognizer == session) recording.setMessage("Checking your words…"); }
                public void onError(int code) { if (recognizer == session) finishVoice("", errorMessage(code)); }
                public void onResults(Bundle results) {
                    if (recognizer != session) return;
                    ArrayList<String> words = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    if (words == null || words.isEmpty()) finishVoice("", "No words were recognized. Try again.");
                    else finishVoice(words.get(0), "");
                }
                public void onBeginningOfSpeech() {}
                public void onRmsChanged(float rms) {}
                public void onBufferReceived(byte[] buffer) {}
                public void onPartialResults(Bundle results) {}
                public void onEvent(int type, Bundle params) {}
            });
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ar-SA");
            session.startListening(intent);
        } catch (RuntimeException ex) {
            finishVoice("", "The speech service could not start. Check your selected speech service and microphone permission.");
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

    private void releaseVoice() {
        SpeechRecognizer old = recognizer;
        recognizer = null;
        if (old != null) old.destroy();
        if (recording != null) { recording.dismiss(); recording = null; }
    }

    private void finishVoice(String words, String message) {
        String key = pendingKey;
        pendingKey = null;
        releaseVoice();
        if (key == null) return;
        String args = JSONObject.quote(key) + "," + JSONObject.quote(words) + "," + JSONObject.quote(message);
        page.evaluateJavascript("window.voiceResult && voiceResult(" + args + ")", null);
    }
    @Override protected void onStop() {
        if (recognizer != null) finishVoice("", "Recording stopped.");
        super.onStop();
    }

    @Override protected void onDestroy() {
        releaseVoice();
        super.onDestroy();
    }
}
