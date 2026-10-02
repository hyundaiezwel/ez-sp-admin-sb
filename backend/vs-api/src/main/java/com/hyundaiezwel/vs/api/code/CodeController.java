package com.hyundaiezwel.vs.api.code;

import com.hyundaiezwel.vs.api.auth.LoginUser;
import com.hyundaiezwel.vs.api.common.ApiResponse;
import com.hyundaiezwel.vs.auth.AuthenticatedUser;
import com.hyundaiezwel.vs.code.Code;
import com.hyundaiezwel.vs.code.CodeReader;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 공통코드 조회 GET /api/codes?groups=A,B → { A: [...], B: [...] }. 로그인 필요. */
@RestController
public class CodeController {

    private final CodeReader codeReader;

    public CodeController(CodeReader codeReader) {
        this.codeReader = codeReader;
    }

    @GetMapping("/api/codes")
    public ApiResponse<Map<String, List<Code>>> codes(@LoginUser AuthenticatedUser user, @RequestParam List<String> groups) {
        Map<String, List<Code>> result = new LinkedHashMap<>();
        groups.forEach(g -> result.put(g, new java.util.ArrayList<>()));
        codeReader.findByGroups(List.copyOf(result.keySet())).forEach(c -> result.get(c.cdGrp()).add(c));
        return ApiResponse.ok(result);
    }
}
