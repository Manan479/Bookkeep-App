package com.bookkeep.app

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.print.PrintAttributes
import android.print.PrintManager
import android.util.Base64
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
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

class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView
    private var fileCallback: ValueCallback<Array<Uri>>? = null

    // The page hands a file over here and Android's own "save to..." dialog asks where to put it. A WebView
    // cannot download a blob at all, so without this bridge an export did nothing and said it had worked.
    private var saveName = "bookkeep.csv"
    private var saveBody: ByteArray = ByteArray(0)
    private val SAVE_REQUEST = 4711

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
        window.statusBarColor = Color.parseColor("#0F5B3F")
        window.navigationBarColor = Color.parseColor("#0F5B3F")

        web = WebView(this)
        setContentView(web)

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
