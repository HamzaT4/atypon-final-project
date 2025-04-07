package com.collabcode.executor_cpp;


import org.springframework.stereotype.Service;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class CppExecutorService {
    public String execute(String code) throws IOException, InterruptedException {
        Path tempDir = Files.createTempDirectory("cpp-code");
        File source = new File(tempDir.toFile(), "main.cpp");

        try (FileWriter writer = new FileWriter(source)) {
            writer.write(code);
        }

        Process compile = new ProcessBuilder("g++", source.getAbsolutePath(), "-o", tempDir + "/a.out")
                .redirectErrorStream(true).start();
        compile.waitFor();

        if (compile.exitValue() != 0) {
            return new String(compile.getInputStream().readAllBytes());
        }

        Process run = new ProcessBuilder(tempDir + "/a.out").redirectErrorStream(true).start();
        String output = new String(run.getInputStream().readAllBytes());
        run.waitFor();
        return output;
    }
}