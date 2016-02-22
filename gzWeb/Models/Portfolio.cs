﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace gzWeb.Models {

    /// <summary>
    /// PHase 1: We use Low, Medium, High.
    /// </summary>
    public enum RiskToleranceEnum {

        Low = 1,

        Low_Medium,

        Medium,

        Medium_High,

        High
    }

    /// A collection of funds...weighted (from Conservartive to High Stakes).
    /// Many to Many with Funds with additional fields in association table PortFund
    /// Design http://stackoverflow.com/questions/7050404/create-code-first-many-to-many-with-additional-fields-in-association-table
    public class Portfolio {

        [Key, DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Index(IsUnique=true), Required]
        public RiskToleranceEnum RiskTolerance { get; set; }

        public virtual ICollection<PortFund> PortFunds { get; set; }

        public bool IsActive { get; set; }
    }
}