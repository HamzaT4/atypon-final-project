package com.collabcode.executor_js;


import org.springframework.stereotype.Service;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class JsExecutorService {
    public String execute(String code) throws IOException, InterruptedException {
        Path tempDir = Files.createTempDirectory("js-code");
        File script = new File(tempDir.toFile(), "script.js");

        try (FileWriter writer = new FileWriter(script)) {
            writer.write(code);
        }

        Process process = new ProcessBuilder("node", script.getAbsolutePath()).redirectErrorStream(true).start();
        String output = new String(process.getInputStream().readAllBytes());
        process.waitFor();
        return output;
    }
}
