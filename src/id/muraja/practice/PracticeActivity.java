package id.muraja.practice;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognizerIntent;
import android.view.WindowInsets;
import android.webkit.*;
import org.json.JSONObject;
import java.util.ArrayList;

public class PracticeActivity extends Activity {
    private WebView page;
    private String pendingKey;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if (state != null) pendingKey = state.getString("pendingKey");
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
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ar");
            intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
            intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Recite this ayah in Arabic");
            try { startActivityForResult(intent, 7); }
            catch (ActivityNotFoundException | SecurityException ex) { finishVoice("", "Speech recognition is unavailable. Use a hint or reveal the ayah to check it yourself."); }
        });
    }
    private void finishVoice(String words, String message) {
        String key = pendingKey;
        pendingKey = null;
        if (key == null) return;
        String args = JSONObject.quote(key) + "," + JSONObject.quote(words) + "," + JSONObject.quote(message);
        page.evaluateJavascript("window.voiceResult && voiceResult(" + args + ")", null);
    }
    @Override protected void onSaveInstanceState(Bundle state) {
        state.putString("pendingKey", pendingKey);
        super.onSaveInstanceState(state);
    }
    @Override protected void onActivityResult(int code, int result, Intent data) {
        super.onActivityResult(code, result, data);
        if (code != 7) return;
        ArrayList<String> words = data == null ? null : data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
        if (result == RESULT_OK && words != null && !words.isEmpty()) finishVoice(words.get(0), "");
        else finishVoice("", "No speech result. Try again or check the ayah yourself.");
    }
}
