package com.collabcode.executor_python;

import org.springframework.stereotype.Service;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class PythonExecutorService {
    public String execute(String code) throws IOException, InterruptedException {
        Path tempDir = Files.createTempDirectory("python-code");
        File script = new File(tempDir.toFile(), "script.py");

        try (FileWriter writer = new FileWriter(script)) {
            writer.write(code);
        }

        ProcessBuilder pb = new ProcessBuilder("python3", script.getAbsolutePath());
        pb.redirectErrorStream(true);
        Process process = pb.start();
        String result = new String(process.getInputStream().readAllBytes());
        process.waitFor();
        return result;
    }
}
