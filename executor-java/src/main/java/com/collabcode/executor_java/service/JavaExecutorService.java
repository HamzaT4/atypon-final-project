package com.collabcode.executor_java.service;

import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class JavaExecutorService {

    public String execute(String code) throws IOException, InterruptedException {
        String className = "UserCode";
        Path tempDir = Files.createTempDirectory("code");
        File sourceFile = new File(tempDir.toFile(), className + ".java");

        // Write source code to file
        try (FileWriter writer = new FileWriter(sourceFile)) {
            writer.write(code);
        }

        // Compile the Java file
        Process compile = new ProcessBuilder("javac", sourceFile.getAbsolutePath())
                .redirectErrorStream(true)
                .directory(tempDir.toFile())
                .start();

        String compileOutput = new String(compile.getInputStream().readAllBytes());
        compile.waitFor();

        if (compile.exitValue() != 0) {
            return "Compilation failed:\n" + compileOutput;
        }

        // Run the class
        Process run = new ProcessBuilder("java", "-cp", tempDir.toString(), className)
                .redirectErrorStream(true)
                .start();

        String output = new String(run.getInputStream().readAllBytes());
        run.waitFor();

        return output;
    }
}
