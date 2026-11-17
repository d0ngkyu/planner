import com.android.apksig.ApkSigner;
import com.android.apksig.ApkVerifier;
import java.io.*;
import java.security.*;
import java.security.cert.X509Certificate;
import java.util.*;

// Password comes from a process environment variable, never argv or source control.
class SignApk {
    public static void main(String[] args) throws Exception {
        char[] password = Objects.requireNonNull(System.getenv("PLANNER_KEY_PASSWORD")).toCharArray();
        KeyStore store = KeyStore.getInstance("PKCS12");
        try (var input = new FileInputStream(args[0])) { store.load(input, password); }
        var key = (PrivateKey) store.getKey("planner", password);
        var certificate = (X509Certificate) store.getCertificate("planner");
        var signer = new ApkSigner.SignerConfig.Builder("planner", key, List.of(certificate)).build();
        new ApkSigner.Builder(List.of(signer)).setInputApk(new File(args[1])).setOutputApk(new File(args[2]))
            .setMinSdkVersion(24).setV1SigningEnabled(true).setV2SigningEnabled(true).setV3SigningEnabled(true)
            .setV4SigningEnabled(false).build().sign();
        var verification = new ApkVerifier.Builder(new File(args[2])).build().verify();
        if (!verification.isVerified()) throw new IllegalStateException(verification.getErrors().toString());
        System.out.println("APK signature verified (v2=" + verification.isVerifiedUsingV2Scheme() + ", v3=" + verification.isVerifiedUsingV3Scheme() + ")");
        System.out.println("Certificate SHA256: " + HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(certificate.getEncoded())));
        Arrays.fill(password, '\0');
    }
}
