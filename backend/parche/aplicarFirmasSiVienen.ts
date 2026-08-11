  private aplicarFirmasSiVienen(planilla: Planilla, dto: ProcesarPlanillaDto): void {
    if (dto.revisadoNombre !== undefined) planilla.revisadoNombre = dto.revisadoNombre;
    if (dto.revisadoIdentificacion !== undefined)
      planilla.revisadoIdentificacion = dto.revisadoIdentificacion;
    if (dto.revisadoCargo !== undefined) planilla.revisadoCargo = dto.revisadoCargo;
    if (dto.revisadoSello !== undefined) planilla.revisadoSello = dto.revisadoSello;
    if (dto.aprobadoNombre !== undefined) planilla.aprobadoNombre = dto.aprobadoNombre;
    if (dto.aprobadoIdentificacion !== undefined)
      planilla.aprobadoIdentificacion = dto.aprobadoIdentificacion;
    if (dto.aprobadoCargo !== undefined) planilla.aprobadoCargo = dto.aprobadoCargo;
    if (dto.aprobadoSello !== undefined) planilla.aprobadoSello = dto.aprobadoSello;
  }
