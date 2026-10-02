package com.hyundaiezwel.vs.infra.db;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hyundaiezwel.vs.auth.Hist;
import com.hyundaiezwel.vs.auth.HistWriter;
import com.hyundaiezwel.vs.auth.Mngr;
import com.hyundaiezwel.vs.auth.MngrRepository;
import com.hyundaiezwel.vs.code.Code;
import com.hyundaiezwel.vs.code.CodeReader;
import org.springframework.stereotype.Component;

import java.util.List;

/** vs_mngr_b · vs_hist_h · vs_cd_c 어댑터. 포트 메서드를 매퍼로 그대로 넘긴다. */
@Component
public class DbAuthAdapter implements MngrRepository, HistWriter, CodeReader {

    private static final ObjectMapper JSON = new ObjectMapper();

    private final AuthMapper mapper;

    public DbAuthAdapter(AuthMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public Mngr findById(String mngrId) {
        return mngrId == null ? null : mapper.findMngr(mngrId);
    }

    @Override
    public int updateFailCntAndStatus(Mngr before, int newFailCnt, String newStatus, String usrId, String dtm) {
        return mapper.updateFailCntAndStatus(before.mngrId(), before.failCnt(), before.acntStCd(),
                newFailCnt, newStatus, usrId, dtm);
    }

    @Override
    public int recordLoginSuccess(String mngrId, String dtm) {
        return mapper.recordLoginSuccess(mngrId, dtm);
    }

    @Override
    public int changePassword(String mngrId, String expectedHash, String newHash, String dtm) {
        return mapper.changePassword(mngrId, expectedHash, newHash, dtm);
    }

    @Override
    public void write(Hist h) {
        String json;
        try {
            json = h.dtl() == null ? null : JSON.writeValueAsString(h.dtl());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("이력 상세 직렬화 실패", e);
        }
        mapper.insertHist(h.histTypCd(), h.tgtKey(), h.befVal(), h.aftVal(), json, h.ipAddr(), h.regDtm(), h.regUsrId());
    }

    @Override
    public List<Code> findByGroups(List<String> groups) {
        return groups.isEmpty() ? List.of() : mapper.findCodes(groups);
    }
}
