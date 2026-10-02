package com.hyundaiezwel.vs.code;

import java.util.List;

/** 공통코드 조회 포트. */
public interface CodeReader {
    /** use_yn='Y' 만, 그룹·정렬순서 순. */
    List<Code> findByGroups(List<String> groups);
}
