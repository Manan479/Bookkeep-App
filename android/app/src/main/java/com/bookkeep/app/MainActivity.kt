package com.bookkeep.app

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.ClipData
import android.print.PrintAttributes
import android.print.PrintManager
import android.util.Base64
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Build
import android.content.res.Configuration
import android.widget.FrameLayout
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import androidx.core.content.FileProvider
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import org.json.JSONArray
import java.io.File

class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView
    private lateinit var surface: FrameLayout
    private var fileCallback: ValueCallback<Array<Uri>>? = null

    // The page hands a file over here and Android's own "save to..." dialog asks where to put it. A WebView
    // cannot download a blob at all, so without this bridge an export did nothing and said it had worked.
    private var saveName = "bookkeep.csv"
    private var saveBody: ByteArray = ByteArray(0)
    private val SAVE_REQUEST = 4711

    private fun applyNativeTheme(color: Int, dark: Boolean) {
        surface.setBackgroundColor(color)
        web.setBackgroundColor(color)
        window.decorView.setBackgroundColor(color)
        WindowCompat.getInsetsController(window, window.decorView).apply {
            isAppearanceLightStatusBars = !dark
            isAppearanceLightNavigationBars = !dark
        }
    }

    inner class Appearance {
        @JavascriptInterface
        fun setTheme(background: String, dark: Boolean) {
            if (!Regex("^#[0-9a-fA-F]{6}$").matches(background)) return
            runOnUiThread { applyNativeTheme(Color.parseColor(background), dark) }
        }
    }

    // Expose only generated PDFs from the dedicated cache directory through temporary URI grants.
    inner class Sharer {
        @JavascriptInterface
        fun shareFiles(payload: String) {
            runOnUiThread {
                try {
                    val files = JSONArray(payload)
                    require(files.length() in 1..100) { "Select between 1 and 100 documents to share" }
                    val directory = File(cacheDir, "shared-invoices").apply { mkdirs() }
                    // Expire prior exports after a day; recipients may still be reading recent shares.
                    directory.listFiles()?.filter { System.currentTimeMillis() - it.lastModified() > 86400000L }?.forEach { it.delete() }
                    val uris = ArrayList<Uri>()
                    val prefix = System.currentTimeMillis().toString()
                    for (i in 0 until files.length()) {
                        val entry = files.getJSONObject(i)
                        val name = entry.getString("name").replace(Regex("[^A-Za-z0-9._-]"), "_")
                        require(name.endsWith(".pdf")) { "Only PDF documents can be shared" }
                        val bytes = Base64.decode(entry.getString("base64"), Base64.DEFAULT)
                        require(bytes.size <= 30 * 1024 * 1024) { "PDF is too large to share" }
                        val file = File(directory, "$prefix-$i-$name")
                        file.writeBytes(bytes)
                        uris.add(FileProvider.getUriForFile(this@MainActivity, "$packageName.exports", file))
                    }
                    val intent = Intent(if (uris.size == 1) Intent.ACTION_SEND else Intent.ACTION_SEND_MULTIPLE).apply {
                        type = "application/pdf"
                        if (uris.size == 1) putExtra(Intent.EXTRA_STREAM, uris[0]) else putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        clipData = ClipData.newUri(contentResolver, "Bookkeep invoices", uris[0]).also { clip ->
                            uris.drop(1).forEach { clip.addItem(ClipData.Item(it)) }
                        }
                    }
                    startActivity(Intent.createChooser(intent, "Share invoices"))
                } catch (error: Exception) {
                    val message = org.json.JSONObject.quote("Could not share PDFs: " + (error.message ?: "Try saving them first"))
                    web.evaluateJavascript("toast($message)", null)
                }
            }
        }
    }

    // The page asks Android to save a file and Android asks where. Two ways in: text (CSV, JSON) and bytes
    // (a PNG, sent as base64), because a WebView cannot download a blob at all.
    inner class Saver {
        @JavascriptInterface
        fun save(name: String, text: String, mime: String) {
            saveName = name
            saveBody = text.toByteArray()
            askWhere(name, mime)
        }

        @JavascriptInterface
        fun saveBytes(name: String, base64: String, mime: String) {
            saveName = name
            saveBody = try {
                Base64.decode(base64, Base64.DEFAULT)
            } catch (e: Exception) {
                ByteArray(0)
            }
            askWhere(name, mime)
        }

        private fun askWhere(name: String, mime: String) {
            runOnUiThread {
                try {
                    val i = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = if (mime.isNullOrBlank()) "text/plain" else mime
                        putExtra(Intent.EXTRA_TITLE, name)
                    }
                    startActivityForResult(i, SAVE_REQUEST)
                } catch (e: Exception) {
                    tellPage(false)
                }
            }
        }
    }

    // window.print() does nothing in a WebView. Android's own print dialog does, and it offers "Save as PDF".
    inner class Printer {
        @JavascriptInterface
        fun printPage(job: String) {
            runOnUiThread {
                try {
                    val pm = getSystemService(Context.PRINT_SERVICE) as PrintManager
                    pm.print(job, web.createPrintDocumentAdapter(job), PrintAttributes.Builder().build())
                } catch (e: Exception) {
                }
            }
        }
    }

    private fun tellPage(ok: Boolean) {
        try {
            web.evaluateJavascript("window.saveResult && window.saveResult($ok)", null)
        } catch (e: Exception) {
        }
    }

    @Deprecated("startActivityForResult is still the simplest way to ask Android where to save a file")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != SAVE_REQUEST) return
        val uri = data?.data
        if (resultCode != RESULT_OK || uri == null) {
            tellPage(false)
            return
        }
        var ok = false
        try {
            contentResolver.openOutputStream(uri)?.use { it.write(saveBody) }
            ok = true
        } catch (e: Exception) {
            ok = false
        }
        tellPage(ok)
    }

    // Lets the page open the photo picker (receipt photos, company logo).
    private val picker = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        fileCallback?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data))
        fileCallback = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.isStatusBarContrastEnforced = false
            window.isNavigationBarContrastEnforced = false
        }
        web = WebView(this)
        surface = FrameLayout(this)
        surface.addView(web, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        setContentView(surface)
        // This surface owns system/keyboard insets. Consume them after padding so the WebView
        // does not reserve the same status/gesture areas again through CSS safe-area values.
        // The surface paints behind the transparent bars with the web screen's background.
        ViewCompat.setOnApplyWindowInsetsListener(surface) { view, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            val keyboard = insets.getInsets(WindowInsetsCompat.Type.ime())
            view.setPadding(bars.left, bars.top, bars.right, maxOf(bars.bottom, keyboard.bottom))
            WindowInsetsCompat.CONSUMED
        }
        ViewCompat.requestApplyInsets(surface)
        val initiallyDark = resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES
        applyNativeTheme(Color.parseColor(if (initiallyDark) "#0B120F" else "#F1F4F2"), initiallyDark)

        // Serves the bundled app from a fixed https origin so saved data (localStorage) persists.
        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            textZoom = 100
        }
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? = loader.shouldInterceptRequest(request.url)
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView,
                callback: ValueCallback<Array<Uri>>,
                params: FileChooserParams
            ): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                return try {
                    picker.launch(params.createIntent())
                    true
                } catch (e: Exception) {
                    fileCallback = null
                    false
                }
            }
        }
        web.addJavascriptInterface(Haptics(web), "Haptics")
        web.addJavascriptInterface(Saver(), "Saver")
        web.addJavascriptInterface(Printer(), "Printer")
        web.addJavascriptInterface(Sharer(), "Sharer")
        web.addJavascriptInterface(Appearance(), "Appearance")
        WebView.setWebContentsDebuggingEnabled(true)
        web.loadUrl("https://appassets.androidplatform.net/assets/index.html")

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                web.evaluateJavascript("window.appBack && window.appBack()") { result ->
                    if (result != "true") {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                    }
                }
            }
        })
    }

    override fun onPause() {
        web.evaluateJavascript("window.saveNow && window.saveNow()", null)
        super.onPause()
    }
}
