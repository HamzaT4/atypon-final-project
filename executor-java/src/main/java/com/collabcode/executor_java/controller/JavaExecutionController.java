package com.collabcode.executor_java.controller;

import com.collabcode.executor_java.service.JavaExecutorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/execute")
public class JavaExecutionController {

    @Autowired
    private JavaExecutorService javaExecutorService;

    @PostMapping("/java")
    public String runJavaCode(@RequestBody String code) throws IOException, InterruptedException {
        return javaExecutorService.execute(code);
    }
}
