package com.collabcode.executor_cpp;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/execute/cpp")
public class CppExecutionController {
    @Autowired
    private CppExecutorService service;

    @PostMapping
    public String run(@RequestBody String code) throws Exception {
        return service.execute(code);
    }
}