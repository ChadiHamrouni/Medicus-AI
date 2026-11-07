from fastapi import APIRouter, Depends
from .common import verify_internal_api_key
from .instructions import router as instructions_router
from .scenarios import router as scenarios_router
from .tickets import router as tickets_router
from .fixtures import router as fixtures_router
from .evaluate import router as evaluate_router

router = APIRouter(dependencies=[Depends(verify_internal_api_key)])

router.include_router(instructions_router)
router.include_router(scenarios_router)
router.include_router(tickets_router)
router.include_router(fixtures_router)
router.include_router(evaluate_router)
